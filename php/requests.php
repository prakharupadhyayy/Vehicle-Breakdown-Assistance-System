<?php
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'msg' => 'Not authenticated']);
    exit;
}

$uid    = $_SESSION['user_id'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // User: Create a new breakdown request
    case 'create_request':
        $issue    = trim($_POST['issue_type'] ?? '');
        $desc     = trim($_POST['description'] ?? '');
        $location = trim($_POST['location_address'] ?? '');
        $lat      = $_POST['latitude'] ?? null;
        $lng      = $_POST['longitude'] ?? null;

        if (!$issue || !$location) {
            echo json_encode(['success' => false, 'msg' => 'Issue type and location are required']);
            exit;
        }

        $db = getDB();
        // Check if user already has active pending/accepted request
        $stmt = $db->prepare("SELECT id FROM requests WHERE user_id=? AND status IN ('pending','accepted','in_progress')");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'msg' => 'You already have an active request. Please wait for it to complete.']);
            exit;
        }

        $stmt = $db->prepare("INSERT INTO requests (user_id, issue_type, description, location_address, latitude, longitude) VALUES (?,?,?,?,?,?)");
        $stmt->bind_param('isssdd', $uid, $issue, $desc, $location, $lat, $lng);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'msg' => 'Request raised successfully!', 'request_id' => $db->insert_id]);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Failed to create request']);
        }
        break;

    // User: Get their own requests with provider info
    case 'get_my_requests':
        $db = getDB();
        $stmt = $db->prepare("
            SELECT r.*, 
                   u.full_name AS provider_name, 
                   u.phone AS provider_phone,
                   u.provider_vehicle,
                   u.provider_service
            FROM requests r
            LEFT JOIN users u ON r.accepted_by = u.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'requests' => $rows]);
        break;

    // User: Get updates for a specific request
    case 'get_request_updates':
        $req_id = intval($_GET['request_id'] ?? 0);
        $db = getDB();
        $stmt = $db->prepare("
            SELECT ru.*, u.full_name AS provider_name
            FROM request_updates ru
            JOIN users u ON ru.provider_id = u.id
            WHERE ru.request_id = ?
            ORDER BY ru.created_at ASC
        ");
        $stmt->bind_param('i', $req_id);
        $stmt->execute();
        $updates = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'updates' => $updates]);
        break;

    // User: Cancel their request
    case 'cancel_request':
        $req_id = intval($_POST['request_id'] ?? 0);
        $db = getDB();
        $stmt = $db->prepare("UPDATE requests SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'");
        $stmt->bind_param('ii', $req_id, $uid);
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'msg' => 'Request cancelled']);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Cannot cancel (already accepted or not found)']);
        }
        break;

    // Provider: Get all pending requests
    case 'get_pending_requests':
        $db = getDB();
        $stmt = $db->prepare("
            SELECT r.*, u.full_name AS user_name, u.phone AS user_phone
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        ");
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'requests' => $rows]);
        break;

    // Provider: Accept a request
    case 'accept_request':
        $req_id = intval($_POST['request_id'] ?? 0);
        $db = getDB();

        // Check if provider already has active job
        $stmt = $db->prepare("SELECT id FROM requests WHERE accepted_by=? AND status IN ('accepted','in_progress')");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'msg' => 'You already have an active job. Complete it first.']);
            exit;
        }

        $stmt = $db->prepare("UPDATE requests SET status='accepted', accepted_by=?, accepted_at=NOW() WHERE id=? AND status='pending'");
        $stmt->bind_param('ii', $uid, $req_id);
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            // Update provider status to busy
            $db->query("UPDATE users SET provider_status='busy' WHERE id=$uid");
            // Add auto update
            $msg = "Provider accepted your request and is on the way!";
            $ins = $db->prepare("INSERT INTO request_updates (request_id, provider_id, message) VALUES (?,?,?)");
            $ins->bind_param('iis', $req_id, $uid, $msg);
            $ins->execute();
            echo json_encode(['success' => true, 'msg' => 'Request accepted!']);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Request no longer available']);
        }
        break;

    // Provider: Get their accepted/active requests
    case 'get_provider_jobs':
        $db = getDB();
        $stmt = $db->prepare("
            SELECT r.*, u.full_name AS user_name, u.phone AS user_phone
            FROM requests r
            JOIN users u ON r.user_id = u.id
            WHERE r.accepted_by = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'jobs' => $rows]);
        break;

    // Provider: Send a status update
    case 'send_update':
        $req_id = intval($_POST['request_id'] ?? 0);
        $msg    = trim($_POST['message'] ?? '');
        if (!$msg) {
            echo json_encode(['success' => false, 'msg' => 'Message cannot be empty']);
            exit;
        }
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO request_updates (request_id, provider_id, message) VALUES (?,?,?)");
        $stmt->bind_param('iis', $req_id, $uid, $msg);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'msg' => 'Update sent']);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Failed to send update']);
        }
        break;

    // Provider: Mark job as in_progress
    case 'start_job':
        $req_id = intval($_POST['request_id'] ?? 0);
        $db = getDB();
        $stmt = $db->prepare("UPDATE requests SET status='in_progress' WHERE id=? AND accepted_by=?");
        $stmt->bind_param('ii', $req_id, $uid);
        $stmt->execute();
        $msg = "Provider has arrived at your location and work has started.";
        $ins = $db->prepare("INSERT INTO request_updates (request_id, provider_id, message) VALUES (?,?,?)");
        $ins->bind_param('iis', $req_id, $uid, $msg);
        $ins->execute();
        echo json_encode(['success' => true]);
        break;

    // Provider: Complete a job
    case 'complete_job':
        $req_id = intval($_POST['request_id'] ?? 0);
        $db = getDB();
        $stmt = $db->prepare("UPDATE requests SET status='completed', completed_at=NOW() WHERE id=? AND accepted_by=?");
        $stmt->bind_param('ii', $req_id, $uid);
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            $db->query("UPDATE users SET provider_status='available' WHERE id=$uid");
            $msg = "Job completed successfully. Thank you for using RoadRescue!";
            $ins = $db->prepare("INSERT INTO request_updates (request_id, provider_id, message) VALUES (?,?,?)");
            $ins->bind_param('iis', $req_id, $uid, $msg);
            $ins->execute();
            echo json_encode(['success' => true, 'msg' => 'Job marked as completed']);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Failed']);
        }
        break;

    // User: Submit rating
    case 'rate_provider':
        $req_id     = intval($_POST['request_id'] ?? 0);
        $provider_id= intval($_POST['provider_id'] ?? 0);
        $rating     = intval($_POST['rating'] ?? 0);
        $review     = trim($_POST['review'] ?? '');
        if ($rating < 1 || $rating > 5) {
            echo json_encode(['success' => false, 'msg' => 'Rating must be 1-5']);
            exit;
        }
        $db = getDB();
        // Check no duplicate
        $stmt = $db->prepare("SELECT id FROM ratings WHERE request_id=? AND user_id=?");
        $stmt->bind_param('ii', $req_id, $uid);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'msg' => 'Already rated']);
            exit;
        }
        $stmt = $db->prepare("INSERT INTO ratings (request_id, user_id, provider_id, rating, review) VALUES (?,?,?,?,?)");
        $stmt->bind_param('iiiis', $req_id, $uid, $provider_id, $rating, $review);
        $stmt->execute();
        echo json_encode(['success' => true, 'msg' => 'Thank you for your feedback!']);
        break;

    // Get provider stats for dashboard
    case 'get_provider_stats':
        $db = getDB();
        $total = $db->query("SELECT COUNT(*) as c FROM requests WHERE accepted_by=$uid AND status='completed'")->fetch_assoc()['c'];
        $avg   = $db->query("SELECT ROUND(AVG(rating),1) as r FROM ratings WHERE provider_id=$uid")->fetch_assoc()['r'];
        $active= $db->query("SELECT COUNT(*) as c FROM requests WHERE accepted_by=$uid AND status IN ('accepted','in_progress')")->fetch_assoc()['c'];
        echo json_encode(['success' => true, 'total_completed' => $total, 'avg_rating' => $avg ?? 'N/A', 'active_jobs' => $active]);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>

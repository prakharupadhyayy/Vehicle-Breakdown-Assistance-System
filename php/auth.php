<?php
require_once 'config.php';
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    case 'register':
        $name     = trim($_POST['full_name'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $phone    = trim($_POST['phone'] ?? '');
        $pass     = $_POST['password'] ?? '';
        $is_prov  = intval($_POST['is_provider'] ?? 0);
        $service  = trim($_POST['provider_service'] ?? '');
        $vehicle  = trim($_POST['provider_vehicle'] ?? '');

        if (!$name || !$email || !$phone || !$pass) {
            echo json_encode(['success' => false, 'msg' => 'All fields are required']);
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'msg' => 'Invalid email address']);
            exit;
        }
        if (strlen($pass) < 6) {
            echo json_encode(['success' => false, 'msg' => 'Password must be at least 6 characters']);
            exit;
        }

        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'msg' => 'Email already registered']);
            exit;
        }

        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $prov_service = $is_prov ? $service : null;
        $prov_vehicle = $is_prov ? $vehicle : null;
        $prov_status  = $is_prov ? 'available' : 'offline';

        $stmt = $db->prepare("INSERT INTO users (full_name, email, phone, password, is_provider, provider_service, provider_vehicle, provider_status) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->bind_param('ssssisss', $name, $email, $phone, $hash, $is_prov, $prov_service, $prov_vehicle, $prov_status);
        
        if ($stmt->execute()) {
            $user_id = $db->insert_id;
            $_SESSION['user_id']    = $user_id;
            $_SESSION['user_name']  = $name;
            $_SESSION['is_provider']= $is_prov;
            echo json_encode(['success' => true, 'msg' => 'Registered successfully', 'is_provider' => $is_prov, 'name' => $name]);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Registration failed']);
        }
        break;

    case 'login':
        $email = trim($_POST['email'] ?? '');
        $pass  = $_POST['password'] ?? '';
        $role  = $_POST['role'] ?? 'user'; // 'user' or 'provider'

        if (!$email || !$pass) {
            echo json_encode(['success' => false, 'msg' => 'Email and password required']);
            exit;
        }

        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            echo json_encode(['success' => false, 'msg' => 'No account found with this email']);
            exit;
        }

        $user = $result->fetch_assoc();
        if (!password_verify($pass, $user['password'])) {
            echo json_encode(['success' => false, 'msg' => 'Incorrect password']);
            exit;
        }

        if ($role === 'provider' && !$user['is_provider']) {
            echo json_encode(['success' => false, 'msg' => 'This account is not registered as a provider. Please register as provider first.']);
            exit;
        }

        $_SESSION['user_id']     = $user['id'];
        $_SESSION['user_name']   = $user['full_name'];
        $_SESSION['is_provider'] = $user['is_provider'];
        $_SESSION['login_role']  = $role;

        echo json_encode([
            'success'     => true,
            'msg'         => 'Login successful',
            'name'        => $user['full_name'],
            'is_provider' => $user['is_provider'],
            'role'        => $role
        ]);
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'check_session':
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'logged_in'   => true,
                'user_id'     => $_SESSION['user_id'],
                'user_name'   => $_SESSION['user_name'],
                'is_provider' => $_SESSION['is_provider'],
                'role'        => $_SESSION['login_role'] ?? 'user'
            ]);
        } else {
            echo json_encode(['logged_in' => false]);
        }
        break;

    // Upgrade existing user to also be a provider
    case 'become_provider':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'msg' => 'Not logged in']);
            exit;
        }
        $service = trim($_POST['provider_service'] ?? '');
        $vehicle = trim($_POST['provider_vehicle'] ?? '');
        if (!$service || !$vehicle) {
            echo json_encode(['success' => false, 'msg' => 'Service and vehicle info required']);
            exit;
        }
        $db = getDB();
        $stmt = $db->prepare("UPDATE users SET is_provider=1, provider_service=?, provider_vehicle=?, provider_status='available' WHERE id=?");
        $stmt->bind_param('ssi', $service, $vehicle, $_SESSION['user_id']);
        if ($stmt->execute()) {
            $_SESSION['is_provider'] = 1;
            echo json_encode(['success' => true, 'msg' => 'Now registered as provider!']);
        } else {
            echo json_encode(['success' => false, 'msg' => 'Failed to upgrade account']);
        }
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>

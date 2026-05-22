CREATE DATABASE IF NOT EXISTS roadrescue;
USE roadrescue;

-- Users Table (handles both user and provider roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_provider TINYINT(1) DEFAULT 0,
    provider_service VARCHAR(100) DEFAULT NULL,  -- e.g., Towing, Mechanic, Fuel, Tyre
    provider_vehicle VARCHAR(100) DEFAULT NULL,
    provider_status ENUM('available','busy','offline') DEFAULT 'offline',
    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,
    profile_pic VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Breakdown Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    issue_type VARCHAR(100) NOT NULL,        -- Flat Tyre, Dead Battery, etc.
    description TEXT,
    location_address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,
    status ENUM('pending','accepted','in_progress','completed','cancelled') DEFAULT 'pending',
    accepted_by INT DEFAULT NULL,
    accepted_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Provider Updates / Status Messages Table
CREATE TABLE IF NOT EXISTS request_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    provider_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    user_id INT NOT NULL,
    provider_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Sample data
INSERT INTO users (full_name, email, phone, password, is_provider, provider_service, provider_vehicle, provider_status) VALUES
('Rahul Sharma', 'rahul@email.com', '9876543210', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'Towing & Recovery', 'Tow Truck - DL01AB1234', 'available'),
('Priya Mehta', 'priya@email.com', '9123456780', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'Mechanical Repair', 'Service Van - UP14CD5678', 'available'),
('Amit Singh', 'amit@email.com', '9988776655', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'Fuel Delivery', 'Bike - UP81EF9012', 'available');
-- Default password for demo: "password"

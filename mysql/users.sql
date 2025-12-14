CREATE DATABASE IF NOT EXISTS click_fit_db;
USE click_fit_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    userId INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    type ENUM('admin', 'trainer', 'member', 'guest') DEFAULT 'member',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (active),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    profileId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    fitness_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    goals TEXT,
    profile_image VARCHAR(255),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded images table
CREATE TABLE IF NOT EXISTS uploaded_images (
    imageId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size INT, -- in bytes
    file_type VARCHAR(50),
    upload_type ENUM('progress', 'workout', 'meal', 'other') DEFAULT 'progress',
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_upload_type (upload_type),
    INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workout logs table
CREATE TABLE IF NOT EXISTS workout_logs (
    logId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    workout_date DATE NOT NULL,
    workout_type VARCHAR(100),
    duration_minutes INT,
    calories_burned INT,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    INDEX idx_userId_workout_date (userId, workout_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stored Procedure: addUser
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS addUser(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_type ENUM('admin', 'trainer', 'member', 'guest'),
    IN p_active BOOLEAN
)
BEGIN
    DECLARE user_count INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Check if user already exists
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE email = p_email;
    
    IF user_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User with this email already exists';
    ELSE
        -- Insert new user
        INSERT INTO users (email, password, type, active)
        VALUES (p_email, p_password, p_type, p_active);
        
        -- Get the new user ID
        SET @new_user_id = LAST_INSERT_ID();
        
        -- Create empty profile for the user
        INSERT INTO user_profiles (userId)
        VALUES (@new_user_id);
        
        COMMIT;
        
        -- Return success message
        SELECT 
            'User created successfully' AS message,
            @new_user_id AS userId,
            p_email AS email,
            p_type AS userType;
    END IF;
END$$

DELIMITER ;

-- Stored Procedure: getUserByEmail
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS getUserByEmail(
    IN p_email VARCHAR(255)
)
BEGIN
    SELECT 
        u.userId,
        u.email,
        u.type,
        u.active,
        u.created_at,
        p.first_name,
        p.last_name,
        p.fitness_level,
        p.profile_image
    FROM users u
    LEFT JOIN user_profiles p ON u.userId = p.userId
    WHERE u.email = p_email
    AND u.active = TRUE;
END$$

DELIMITER ;

-- Stored Procedure: updateUserStatus
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS updateUserStatus(
    IN p_userId INT,
    IN p_active BOOLEAN
)
BEGIN
    UPDATE users 
    SET active = p_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE userId = p_userId;
    
    IF ROW_COUNT() > 0 THEN
        SELECT 'User status updated successfully' AS message;
    ELSE
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User not found';
    END IF;
END$$

DELIMITER ;

-- Insert sample data (for testing)
INSERT INTO users (email, password, type, active) VALUES
('admin@clickfit.com', '$2y$10$YourHashedPasswordHere', 'admin', TRUE),
('trainer.john@clickfit.com', '$2y$10$YourHashedPasswordHere', 'trainer', TRUE),
('member.sarah@clickfit.com', '$2y$10$YourHashedPasswordHere', 'member', TRUE),
('guest.demo@clickfit.com', '$2y$10$YourHashedPasswordHere', 'guest', TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Call the stored procedure to add a new user
CALL addUser('new.user@clickfit.com', '$2y$10$HashedPasswordExample', 'member', TRUE);

-- Example queries
SELECT 'Current users:' AS '';
SELECT userId, email, type, active, created_at FROM users;

SELECT 'User profiles:' AS '';
SELECT p.userId, u.email, p.first_name, p.last_name, p.fitness_level 
FROM user_profiles p
JOIN users u ON p.userId = u.userId;

-- Create a view for active users
CREATE OR REPLACE VIEW active_users_view AS
SELECT 
    u.userId,
    u.email,
    u.type,
    u.created_at,
    p.first_name,
    p.last_name,
    p.fitness_level
FROM users u
LEFT JOIN user_profiles p ON u.userId = p.userId
WHERE u.active = TRUE
ORDER BY u.created_at DESC;

-- Show the view
SELECT 'Active users view:' AS '';
SELECT * FROM active_users_view LIMIT 5;

-- Create indexes for better performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_user_profiles_fitness ON user_profiles(fitness_level);
CREATE INDEX idx_workout_logs_date ON workout_logs(workout_date);

-- Show table information
SELECT 'Table information:' AS '';
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('users', 'user_profiles', 'uploaded_images', 'workout_logs');
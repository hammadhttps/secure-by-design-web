# 🔐 Password Security Analysis & Authentication System

A full-stack security project demonstrating modern authentication, password-strength evaluation, and defense against common web vulnerabilities. Designed as a practical learning environment for secure web development.

---

## 🎯 Core Objectives
- Implement secure session-based authentication  
- Analyze password strength (entropy, zxcvbn score, crack-time estimation)  
- Protect against SQL Injection, XSS, CSRF, brute-force attacks  
- Provide a safe environment for security testing  
- Generate detailed security reports using Python scripts  

---

## 🏗️ Tech Stack

### **Frontend (React + Vite)**
- React 18 + Vite  
- Tailwind CSS  
- Zod validation  
- DOMPurify sanitization  
- React Router DOM  
- Context API  

### **Backend (Node.js + Express)**
- Express MVC pattern  
- XAMPP MySQL (MariaDB) with connection pooling  
- bcrypt hashing (12 rounds)  
- Secure cookie-based sessions  
- Helmet, CORS, Rate Limiting  
- express-validator  
- Winston logger  



## 🗂️ Key Database Tables (Simplified)
```sql
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE failed_logins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45),
  email VARCHAR(100),
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_analysis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  password_entropy DECIMAL(10,2),
  zxcvbn_score INT,
  estimated_crack_time VARCHAR(50),
  hash_algorithm VARCHAR(20),
  hash_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE cracking_simulations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  password_hash VARCHAR(255),
  attack_type VARCHAR(50),
  attempts INT,
  success BOOLEAN,
  time_taken_ms INT,
  simulated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hash_comparisons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  bcrypt_hash VARCHAR(255),
  argon2_hash VARCHAR(255),
  bcrypt_time_ms INT,
  argon2_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

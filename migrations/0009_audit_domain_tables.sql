-- Audit domain: clients, audit_projects, project_assignments, audit_documents
-- Run after existing migrations. Compatible with MySQL 5.7+.

-- Clients (auditees) per organization
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NULL,
  ruc VARCHAR(13) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_clients_organization_id (organization_id),
  CONSTRAINT fk_clients_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit projects (engagements) per client
CREATE TABLE IF NOT EXISTS audit_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  client_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  audit_type VARCHAR(50) NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  status ENUM('draft', 'planning', 'in_progress', 'review', 'closed') NOT NULL DEFAULT 'draft',
  source_audit_project_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_audit_projects_organization_client (organization_id, client_id),
  INDEX idx_audit_projects_status (status),
  CONSTRAINT fk_audit_projects_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_projects_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_projects_source FOREIGN KEY (source_audit_project_id) REFERENCES audit_projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project assignments (users assigned to a project)
CREATE TABLE IF NOT EXISTS project_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('partner', 'manager', 'member') NOT NULL DEFAULT 'member',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY project_assignments_project_user_unique (audit_project_id, user_id),
  CONSTRAINT fk_project_assignments_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit documents (file metadata; file stored in B2/S3)
CREATE TABLE IF NOT EXISTS audit_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  audit_project_id INT NULL,
  node_id INT NULL,
  storage_key VARCHAR(512) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  uploader_id INT NOT NULL,
  analysis_status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_audit_documents_organization (organization_id),
  INDEX idx_audit_documents_project (audit_project_id),
  INDEX idx_audit_documents_node (node_id),
  INDEX idx_audit_documents_uploader (uploader_id),
  CONSTRAINT fk_audit_documents_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_documents_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_documents_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

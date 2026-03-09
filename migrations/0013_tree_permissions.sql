-- Permissions for audit tree node management
INSERT INTO permissions (code, module, description, created_at, updated_at) VALUES
  ('projects.tree.manage', 'projects', 'Manage project tree nodes (create, move, reorder, delete)', NOW(), NOW());

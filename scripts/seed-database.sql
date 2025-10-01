-- Create sample organization
INSERT INTO organizations (id, name, slug, language, "isActive", "createdAt", "updatedAt")
VALUES 
  ('org_sample_123', 'Sample Organization', 'sample', 'en', true, NOW(), NOW());

-- Create admin role
INSERT INTO roles (id, name, description, permissions, "organizationId", "createdAt", "updatedAt")
VALUES 
  ('role_admin_123', 'admin', 'Organization Administrator', 
   '["users.read", "users.write", "users.delete", "roles.read", "roles.write", "roles.delete", "organization.read", "organization.write"]'::json,
   'org_sample_123', NOW(), NOW());

-- Create user role
INSERT INTO roles (id, name, description, permissions, "organizationId", "createdAt", "updatedAt")
VALUES 
  ('role_user_123', 'user', 'Regular User', 
   '["profile.read", "profile.write"]'::json,
   'org_sample_123', NOW(), NOW());

-- Create sample admin user (password: admin123)
INSERT INTO users (id, email, password, "firstName", "lastName", language, "isActive", "emailVerified", "organizationId", "createdAt", "updatedAt")
VALUES 
  ('user_admin_123', 'admin@sample.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G', 
   'Admin', 'User', 'en', true, true, 'org_sample_123', NOW(), NOW());

-- Assign admin role to admin user
INSERT INTO user_roles (id, "userId", "roleId")
VALUES 
  ('ur_admin_123', 'user_admin_123', 'role_admin_123');

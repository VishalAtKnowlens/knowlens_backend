-- Create sample organisation
INSERT INTO organisations (id, name, slug, language, "isActive", "createdAt", "updatedAt")
VALUES 
  ('org_sample_123', 'Sample Organisation', 'sample', 'en', true, NOW(), NOW());

-- Create admin role
INSERT INTO roles (id, name, description, permissions, "organisationId", "createdAt", "updatedAt")
VALUES 
  ('role_admin_123', 'admin', 'Organisation Administrator', 
   '["users.read", "users.write", "users.delete", "roles.read", "roles.write", "roles.delete", "organisation.read", "organisation.write"]'::json,
   'org_sample_123', NOW(), NOW());

-- Create user role
INSERT INTO roles (id, name, description, permissions, "organisationId", "createdAt", "updatedAt")
VALUES 
  ('role_user_123', 'user', 'Regular User', 
   '["profile.read", "profile.write"]'::json,
   'org_sample_123', NOW(), NOW());

-- Create sample admin user (password: admin123)
INSERT INTO users (id, email, password, "firstName", "lastName", language, "isActive", "emailVerified", "organisationId", "createdAt", "updatedAt")
VALUES 
  ('user_admin_123', 'admin@sample.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G', 
   'Admin', 'User', 'en', true, true, 'org_sample_123', NOW(), NOW());

-- Assign admin role to admin user
INSERT INTO user_roles (id, "userId", "roleId")
VALUES 
  ('ur_admin_123', 'user_admin_123', 'role_admin_123');

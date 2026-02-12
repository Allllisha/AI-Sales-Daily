-- Update passwords for existing users
UPDATE users SET password = '$2a$10$nDg3lVnIZcrOWiYvaa52R.eozXDOGV40sSWjkvaUv2tBU5VWbpqzK' WHERE email = 'manager@example.com';
UPDATE users SET password = '$2a$10$MYsmISLwNoHOHmS8gLYxU.MdGjLLR6tq0bPAvjlcyJgOBc3slXuYO' WHERE email = 'tanaka@example.com';
UPDATE users SET password = '$2a$10$ORx1BOOka64cBYJFom.lJ.XKQbHw0xgjpDiqvojOPecGEOTMzAOEG' WHERE email = 'suzuki@example.com';
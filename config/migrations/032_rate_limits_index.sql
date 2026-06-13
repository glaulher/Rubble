ALTER TABLE rate_limits ADD INDEX idx_rate_limits_lookup (ip_address, endpoint, window_start);

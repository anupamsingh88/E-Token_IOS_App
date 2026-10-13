CREATE TABLE IF NOT EXISTS `fertilizer_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_id` varchar(50) NOT NULL UNIQUE,
  `name` varchar(100) NOT NULL,
  `nameHindi` varchar(100) NOT NULL,
  `pricePerBag` decimal(10,2) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

INSERT IGNORE INTO `fertilizer_products` (`type_id`, `name`, `nameHindi`, `pricePerBag`)
VALUES
('urea', 'Urea', 'यूरिया', 266.50),
('dap', 'DAP', 'डीएपी', 1350.00),
('npk', 'NPK', 'एनपीके', 1470.00),
('mop', 'MOP', 'एमओपी', 1700.00);

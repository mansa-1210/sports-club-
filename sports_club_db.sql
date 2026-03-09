/*
 Navicat Premium Data Transfer

 Source Server         : mysql
 Source Server Type    : MySQL
 Source Server Version : 50714
 Source Host           : localhost:3306
 Source Schema         : sportsclub

 Target Server Type    : MySQL
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `username` VARCHAR(20),
  `pass_key` VARCHAR(20),
  `securekey` VARCHAR(20),
  `Full_name` VARCHAR(50),
  PRIMARY KEY (`username`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES ('admin1', 'admin1', 'admin1', 'Sports Club Manager');
INSERT INTO `admin` VALUES ('admin2', 'admin2', 'admin2', 'Deputy Manager');

-- ----------------------------
-- Table structure for log_users
-- ----------------------------
DROP TABLE IF EXISTS `log_users`;
CREATE TABLE `log_users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `users_userid` VARCHAR(20) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `cdate` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `users_userid_idx` (`users_userid`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `userid` VARCHAR(20),
  `username` VARCHAR(40),
  `gender` VARCHAR(8),
  `mobile` VARCHAR(20),
  `email` VARCHAR(100),
  `dob` DATE,
  `joining_date` DATE,
  PRIMARY KEY (`userid`),
  UNIQUE INDEX `email`(`email`),
  INDEX `userid_idx`(`userid`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('1529336794', 'Christiana Mayberry', 'Male', '3362013747', 'christiani@gmail.com', '1968-04-13', '2018-06-18');
INSERT INTO `users` VALUES ('1529336795', 'Shreyansh Gupta', 'Male', '3362013747', 'shreyansh@gmail.com', '1998-12-12', '2020-06-10');

-- ----------------------------
-- Table structure for health_status
-- ----------------------------
DROP TABLE IF EXISTS `health_status`;
CREATE TABLE `health_status` (
  `hid` INT(5) NOT NULL AUTO_INCREMENT,
  `calorie` VARCHAR(8),
  `height` VARCHAR(8),
  `weight` VARCHAR(8),
  `fat` VARCHAR(8),
  `remarks` VARCHAR(200),
  `uid` VARCHAR(20),
  PRIMARY KEY (`hid`),
  INDEX `userID_idx` (`uid`),
  CONSTRAINT `uID` FOREIGN KEY (`uid`) REFERENCES `users` (`userid`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of health_status
-- ----------------------------
INSERT INTO `health_status` VALUES (1, NULL, NULL, NULL, NULL, NULL, '1529336794');
INSERT INTO `health_status` VALUES (2, NULL, NULL, NULL, NULL, NULL, '1529336795');

-- ----------------------------
-- Table structure for plan
-- ----------------------------
DROP TABLE IF EXISTS `plan`;
CREATE TABLE `plan` (
  `pid` VARCHAR(8),
  `planName` VARCHAR(20),
  `description` VARCHAR(200),
  `validity` VARCHAR(20),
  `amount` INT(10) NOT NULL,
  `active` VARCHAR(255),
  PRIMARY KEY (`pid`),
  INDEX `pid_idx` (`pid`)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of plan
-- ----------------------------
INSERT INTO `plan` VALUES ('FOQKJF', 'Football Plan', 'A monthly subscription that unlocks the members access to the football Plan and coach support on chat.', '1', 1000, 'yes');
INSERT INTO `plan` VALUES ('COQKJC', 'Cricket Plan', 'A monthly subscription that unlocks the members access to the Cricket Plan and coach support on chat.', '1', 1500, 'yes');
INSERT INTO `plan` VALUES ('BOQKJB', 'Badminton Plan', 'A monthly subscription that unlocks the members access to the Badminton Plan and coach support on chat.', '1', 800, 'yes');

-- ----------------------------
-- Table structure for enrolls_to
-- ----------------------------
DROP TABLE IF EXISTS `enrolls_to`;
CREATE TABLE `enrolls_to` (
  `et_id` INT(5) NOT NULL AUTO_INCREMENT,
  `pid` VARCHAR(8),
  `uid` VARCHAR(20),
  `paid_date` DATE,
  `expire` DATE,
  `renewal` VARCHAR(15),
  PRIMARY KEY (`et_id`),
  INDEX `user_ID` (`uid`),
  INDEX `plan_ID_idx` (`pid`),
  CONSTRAINT `plan_ID` FOREIGN KEY (`pid`) REFERENCES `plan` (`pid`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `user_ID` FOREIGN KEY (`uid`) REFERENCES `users` (`userid`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of enrolls_to
-- ----------------------------
INSERT INTO `enrolls_to` VALUES (1, 'FOQKJF', '1529336794', '2018-06-18', '2018-07-18', 'yes');

-- ----------------------------
-- Table structure for sports_timetable
-- ----------------------------
DROP TABLE IF EXISTS `sports_timetable`;
CREATE TABLE `sports_timetable` (
  `tid` INT(12) NOT NULL AUTO_INCREMENT,
  `tname` VARCHAR(45),
  `day1` VARCHAR(200),
  `day2` VARCHAR(200),
  `day3` VARCHAR(200),
  `day4` VARCHAR(200),
  `day5` VARCHAR(200),
  `day6` VARCHAR(200),
  `pid` VARCHAR(8),
  PRIMARY KEY (`tid`),
  CONSTRAINT `pID` FOREIGN KEY (`pid`) REFERENCES `plan` (`pid`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Table structure for address
-- ----------------------------
DROP TABLE IF EXISTS `address`;
CREATE TABLE `address` (
  `id` VARCHAR(20),
  `streetName` VARCHAR(40),
  `state` VARCHAR(15),
  `city` VARCHAR(15),
  `zipcode` VARCHAR(20),
  INDEX `userID_idx` (`id`),
  CONSTRAINT `userID` FOREIGN KEY (`id`) REFERENCES `users` (`userid`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=Dynamic;

-- ----------------------------
-- Records of address
-- ----------------------------
INSERT INTO `address` VALUES ('1529336794', '2069 Quarry Drive', 'NC', 'Greensboro', '27409');

-- ----------------------------
-- Structure for Triggers in user table
-- ----------------------------

-- Trigger for deletion
CREATE TRIGGER `deletelog` BEFORE DELETE ON `users`
FOR EACH ROW 
INSERT INTO log_users VALUES (NULL, OLD.userid, 'deleted', NOW());

-- Trigger for insertion
CREATE TRIGGER `insertlog` AFTER INSERT ON `users`
FOR EACH ROW 
INSERT INTO log_users VALUES (NULL, NEW.userid, 'inserted', NOW());

-- Trigger for updation
CREATE TRIGGER `updatelog` AFTER UPDATE ON `users`
FOR EACH ROW 
INSERT INTO log_users VALUES (NULL, NEW.userid, 'updated', NOW());

-- ----------------------------
-- Structure for Stored Procedure in user table
-- ----------------------------
DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `countGender`()
SELECT gender, COUNT(*) 
FROM users 
GROUP BY gender$$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: campus
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `club_members`
--

DROP TABLE IF EXISTS `club_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_members` (
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `position` varchar(50) DEFAULT 'Member',
  `joined_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`club_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `club_members_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `club_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club_members`
--

LOCK TABLES `club_members` WRITE;
/*!40000 ALTER TABLE `club_members` DISABLE KEYS */;
INSERT INTO `club_members` VALUES (1,1,'Coordinator','2026-03-14 13:28:45'),(1,7,'Member','2026-03-19 16:11:32'),(1,9,'Member','2026-03-14 13:28:45'),(1,10,'Coordinator','2026-03-14 13:28:45'),(1,22,'Member','2026-03-17 12:30:24'),(1,23,'Sub-Coordinator','2026-03-19 16:08:45'),(2,2,'Member','2026-03-14 13:28:45'),(2,9,'Member','2026-03-14 13:28:45'),(2,10,'Member','2026-04-20 19:07:26'),(2,22,'coordinator','2026-03-17 12:39:31'),(3,1,'Vice President','2026-03-14 13:28:45'),(3,2,'Technical Lead','2026-03-14 13:28:45'),(3,3,'Member','2026-03-14 13:28:45'),(3,9,'President','2026-03-14 13:28:45'),(3,10,'Technical Lead','2026-03-14 13:28:45'),(4,1,'Member','2026-03-14 13:28:45'),(4,2,'Member','2026-03-14 13:28:45'),(4,3,'Lead Photographer','2026-03-14 13:28:45'),(4,7,'Secretary','2026-03-14 13:28:45'),(4,10,'Member','2026-03-18 20:24:22'),(5,1,'Instrumentalist','2026-03-14 13:28:45'),(5,2,'Member','2026-03-14 13:28:45'),(5,7,'Vocalist','2026-03-14 13:28:45'),(6,1,'Debate Captain','2026-03-14 13:28:45'),(6,2,'Member','2026-03-14 13:28:45'),(6,7,'Member','2026-04-09 16:13:16'),(6,10,'Member','2026-03-14 15:58:15'),(7,1,'Member','2026-03-14 13:28:45'),(7,3,'Sports Secretary','2026-03-14 13:28:45'),(7,7,'Member','2026-03-19 16:16:42'),(7,10,'Member','2026-03-14 17:47:39'),(8,9,'President','2026-03-14 13:28:45'),(8,10,'Member','2026-03-14 13:28:45'),(9,10,'Member','2026-03-17 18:39:38'),(10,7,'Member','2026-04-09 16:22:29'),(10,10,'Member','2026-03-14 16:49:13'),(10,23,'Member','2026-03-19 16:09:07'),(11,7,'Member','2026-03-19 16:27:08'),(11,10,'Member','2026-04-09 16:40:10'),(11,22,'Member','2026-03-17 12:30:22'),(12,10,'Member','2026-03-18 20:22:07');
/*!40000 ALTER TABLE `club_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clubs`
--

DROP TABLE IF EXISTS `clubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clubs` (
  `club_id` int NOT NULL AUTO_INCREMENT,
  `cname` varchar(100) NOT NULL,
  `bio` text,
  `objective` text,
  PRIMARY KEY (`club_id`),
  UNIQUE KEY `cname` (`cname`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clubs`
--

LOCK TABLES `clubs` WRITE;
/*!40000 ALTER TABLE `clubs` DISABLE KEYS */;
INSERT INTO `clubs` VALUES (1,'Coding Club','A community of developers.','To promote open source contribution.'),(2,'Drama Society','The stage is yours.','To perform theater arts.'),(3,'Robotics Club','Building tomorrow\'s machines today','To design and build innovative robots for competitions and research'),(4,'Photography Society','Capturing moments, creating memories','To foster photography skills and document campus life'),(5,'Music Club','Harmony in diversity','To promote musical talent and organize cultural events'),(6,'Debate Society','Where ideas clash and minds expand','To develop critical thinking and public speaking skills'),(7,'Sports Club','Healthy body, healthy mind','To promote sports and fitness among students'),(8,'Literary Circle','Words that inspire','To encourage reading, writing, and literary discussions'),(9,'Entrepreneurship Cell','From ideas to enterprises','To foster innovation and startup culture on campus'),(10,'Dance Crew','Rhythm and motion','To explore various dance forms and perform at events'),(11,'AI/ML Club','Shaping the future with intelligence','To explore artificial intelligence and machine learning applications'),(12,'Environmental Club','Green campus, clean future','To promote environmental awareness and sustainable practices');
/*!40000 ALTER TABLE `clubs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_registrations`
--

DROP TABLE IF EXISTS `event_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `registered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `attendance_status` enum('registered','attended','absent') DEFAULT 'registered',
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `unique_registration` (`user_id`,`event_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_registrations`
--

LOCK TABLES `event_registrations` WRITE;
/*!40000 ALTER TABLE `event_registrations` DISABLE KEYS */;
INSERT INTO `event_registrations` VALUES (9,22,5,'2026-03-17 12:30:05','registered'),(19,10,9,'2026-03-18 20:27:39','registered'),(20,10,5,'2026-03-18 20:47:42','registered'),(21,10,28,'2026-03-18 20:48:46','registered'),(23,10,31,'2026-03-18 22:54:14','registered'),(26,7,31,'2026-03-19 16:15:09','registered'),(27,7,5,'2026-03-19 16:15:19','registered'),(28,7,9,'2026-03-19 16:15:23','registered'),(32,10,19,'2026-04-23 14:50:44','registered');
/*!40000 ALTER TABLE `event_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `about_event` text,
  `date_time` datetime NOT NULL,
  `venue` varchar(200) DEFAULT NULL,
  `club_id` int DEFAULT NULL,
  `fest_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `club_id` (`club_id`),
  KEY `fest_id` (`fest_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`fest_id`) REFERENCES `fests` (`fest_id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (2,'Short Play','A 10-minute satire','2026-05-10 14:00:00','Auditorium',2,NULL,NULL),(3,'Robo-Race','Major highlight of the fest','2026-04-16 11:00:00','Main Ground',NULL,1,NULL),(5,'Python Workshop','Introduction to Python programming','2026-03-25 15:00:00','Seminar Halll',1,NULL,NULL),(6,'Street Play','Social awareness through theater','2026-05-05 17:00:00','Central Plaza',2,NULL,NULL),(7,'Improv Night','Unscripted comedy performances','2026-05-15 19:00:00','Auditorium',2,NULL,NULL),(8,'Robot Wars','Combat robotics competition','2026-04-10 14:00:00','Robotics Lab',3,NULL,NULL),(9,'Arduino Workshop','Learn microcontroller programming','2026-03-30 11:00:00','Electronics Lab',3,NULL,NULL),(10,'Photo Walk','Guided photography session around campus','2026-04-08 07:00:00','Campus Grounds',4,NULL,NULL),(11,'Editing Workshop','Photoshop and Lightroom basics','2026-04-22 16:00:00','Media Room',4,NULL,NULL),(12,'Open Mic Night','Showcase your musical talent','2026-05-20 18:00:00','Amphitheater',5,NULL,NULL),(13,'Band Competition','Inter-college battle of bands','2026-05-25 17:00:00','Main Stage',5,NULL,NULL),(14,'AI Summit','Keynote speeches from industry experts','2026-04-15 10:00:00','Main Auditorium',NULL,1,NULL),(15,'Workshop on LLMs','Hands-on with large language models','2026-04-16 14:00:00','Seminar Hall',NULL,1,NULL),(16,'Startup Pitch','Students pitch their startup ideas','2026-04-17 11:00:00','Incubation Center',NULL,1,NULL),(17,'Fashion Show','Showcasing retro and modern fashion','2026-05-10 18:00:00','Open Air Theatre',NULL,2,NULL),(18,'DJ Night','Popular DJs spinning retro hits','2026-05-11 20:00:00','Sports Ground',NULL,2,NULL),(19,'Art Exhibition','Student artwork display','2026-05-09 10:00:00','Art Gallery',NULL,2,NULL),(20,'Classical Dance','Traditional dance performances','2026-06-01 18:00:00','Auditorium',NULL,3,NULL),(21,'Folk Music','Regional folk music showcase','2026-06-02 16:00:00','Amphitheater',NULL,3,NULL),(22,'Hackathon 2.0','36-hour innovation hackathon','2026-07-10 09:00:00','CS Department',NULL,4,NULL),(23,'Tech Quiz','Inter-college technical quiz','2026-07-11 14:00:00','Lecture Hall',NULL,4,NULL),(24,'Cricket Tournament','Inter-department cricket matches','2026-08-01 09:00:00','Cricket Ground',NULL,5,NULL),(25,'Basketball Championship','3-on-3 basketball tournament','2026-08-02 10:00:00','Sports Complex',NULL,5,NULL),(26,'Poetry Slam','Original poetry performances','2026-09-05 15:00:00','Library Hall',NULL,6,NULL),(27,'Book Discussion','Discussion on contemporary literature','2026-09-06 11:00:00','Reading Room',NULL,6,NULL),(28,'Coding Workshop loda',NULL,'2026-03-17 18:00:00','GymKhana',1,NULL,NULL),(31,'ANOTER NEW EVENT','CHANGED THEME','2026-03-19 18:00:00','GymKhana',1,NULL,NULL),(33,'Nxtwave Hackethon','show your coding skills and win amazing prices ','2026-04-26 18:00:00','CLH',1,NULL,NULL);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fest_coordinators`
--

DROP TABLE IF EXISTS `fest_coordinators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fest_coordinators` (
  `fest_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`fest_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_fc_fest` (`fest_id`),
  CONSTRAINT `fest_coordinators_ibfk_1` FOREIGN KEY (`fest_id`) REFERENCES `fests` (`fest_id`) ON DELETE CASCADE,
  CONSTRAINT `fest_coordinators_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fest_coordinators`
--

LOCK TABLES `fest_coordinators` WRITE;
/*!40000 ALTER TABLE `fest_coordinators` DISABLE KEYS */;
INSERT INTO `fest_coordinators` VALUES (1,1,'Technical Head'),(1,3,'Volunteer'),(1,10,'Core Coordinator'),(1,14,'Technical Head'),(1,15,'Logistics Head'),(1,16,'Volunteer'),(2,7,'Event Coordinator'),(2,9,'Volunteer'),(2,12,'Cultural Head'),(2,18,'Volunteer'),(3,1,'Volunteer'),(3,3,'Core Coordinator'),(3,10,'Technical Head'),(4,14,'Core Coordinator'),(4,15,'Event Coordinator'),(4,16,'Volunteer'),(5,2,'Sports Head'),(5,7,'Event Coordinator'),(5,18,'Volunteer'),(6,9,'Core Coordinator'),(6,10,'Event Coordinator'),(7,1,'Core Coordinator'),(7,3,'Technical Head'),(8,14,'Core Coordinator'),(8,15,'Mentor'),(8,16,'Volunteer'),(9,2,'Cultural Head'),(9,7,'Event Coordinator'),(9,18,'Volunteer'),(10,3,'Technical Head'),(10,9,'Event Coordinator'),(10,10,'Volunteer');
/*!40000 ALTER TABLE `fest_coordinators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fests`
--

DROP TABLE IF EXISTS `fests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fests` (
  `fest_id` int NOT NULL AUTO_INCREMENT,
  `fname` varchar(100) NOT NULL,
  `description` text,
  `theme` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`fest_id`),
  UNIQUE KEY `fname` (`fname`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fests`
--

LOCK TABLES `fests` WRITE;
/*!40000 ALTER TABLE `fests` DISABLE KEYS */;
INSERT INTO `fests` VALUES (1,'TechNexus 2026',NULL,'Future of AI',1),(2,'Cultural-Wave',NULL,'Retro Vibes',1),(3,'Spandan 2026','The annual cultural extravaganza','Vibrant India',1),(4,'TechFest 2026','Celebrating technology and innovation','Digital Revolution',1),(5,'Sports Meet 2026','Annual inter-college sports competition','Go for Gold',1),(6,'Literary Fest 2026','Celebrating words and ideas','Pages of Tomorrow',1),(7,'Innovation Summit 2026','Where ideas meet opportunity','Innovate for Impact',1),(8,'Alumni Meet 2026','Reconnecting with our legacy','Golden Memories',1),(9,'Entrepreneurship Week 2026','Building the next big thing','Startup Saga',1),(10,'Cultural Night 2026','An evening of arts and performances','Starry Night',1),(11,'Tech Symposium 2026','Cutting-edge technology discussions','Future Unlocked',1),(12,'Green Fest 2026','Celebrating sustainability','Eco Warriors',1);
/*!40000 ALTER TABLE `fests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `roll_no` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `branch_dept` varchar(100) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `bio` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `roll_no` (`roll_no`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'21CS01','aman@college.edu','hashed_pw_1','Aman','Sharma','Computer Science',NULL,NULL,NULL,'2026-03-14 13:28:50'),(2,'21ME05','sriya@college.edu','hashed_pw_2','Sriya','Reddy','Mechanical',NULL,NULL,NULL,'2026-03-14 13:28:50'),(3,'22EE09','kevin@college.edu','hashed_pw_3','Kevin','Paul','Electrical',NULL,NULL,NULL,'2026-03-14 13:28:50'),(7,'2403mc03','example@gmail.com','$2b$10$GT2hBOkzRA7cWHFiPohD2eBxa/BuBN2TabcxU9SLxqP7nDLTQx9ei','Ash','kha','MNC',NULL,'https://github.com/Ashray0013','I love Nishant and Ridhi.','2026-03-14 13:28:50'),(9,'109','example1@gmail.com','$2b$10$Rgmg0gIeHjIzXigs/7sJsOfcVrpFmap/LCpYIa1j2euBcIwoy63P6','vinit','lodu','MNC',NULL,NULL,NULL,'2026-03-14 13:28:50'),(10,'108','example2@gmail.com','$2b$10$ELVH5OeOmAEJNjDVejk4XOueTs9KaK.73hPdNkk/ysh/bDdXdx0B2','viki','kaushal','CSE',NULL,'https://github.com/Ashray0013','i am the great\n','2026-03-14 13:28:50'),(11,'20CS15','priya.verma@college.edu','hashed_pw_4','Priya','Verma','Computer Science','https://linkedin.com/in/priya-verma','https://github.com/priyaverma','Full-stack developer passionate about web technologies','2026-03-14 13:28:50'),(12,'21EC22','rahul.singh@college.edu','hashed_pw_5','Rahul','Singh','Electronics','https://linkedin.com/in/rahul-singh',NULL,'Robotics enthusiast and hardware tinkerer','2026-03-14 13:28:50'),(13,'22CS07','anjali.p@college.edu','hashed_pw_6','Anjali','Patel','Computer Science','https://linkedin.com/in/anjali-patel','https://github.com/anjali_p','AI/ML enthusiast, love building intelligent systems','2026-03-14 13:28:50'),(14,'19ME11','arjun.reddy@college.edu','hashed_pw_7','Arjun','Reddy','Mechanical','https://linkedin.com/in/arjun-reddy',NULL,'Automotive engineering enthusiast','2026-03-14 13:28:50'),(15,'21CS31','neha.gupta@college.edu','hashed_pw_8','Neha','Gupta','Computer Science','https://linkedin.com/in/neha-gupta','https://github.com/neha_g','Cybersecurity researcher and CTF player','2026-03-14 13:28:50'),(16,'20EE05','vikram.j@college.edu','hashed_pw_9','Vikram','Joshi','Electrical',NULL,NULL,'Power systems and renewable energy enthusiast','2026-03-14 13:28:50'),(17,'22CS42','kavya.nair@college.edu','hashed_pw_10','Kavya','Nair','Computer Science','https://linkedin.com/in/kavya-nair','https://github.com/kavyanair','UI/UX designer and frontend developer','2026-03-14 13:28:50'),(18,'21CE18','rohan.d@college.edu','hashed_pw_11','Rohan','Desai','Civil Engineering','https://linkedin.com/in/rohan-desai',NULL,'Structural design and sustainable architecture','2026-03-14 13:28:50'),(19,'20CS28','simran.k@college.edu','hashed_pw_12','Simran','Kaur','Computer Science','https://linkedin.com/in/simran-kaur','https://github.com/simrank','DevOps engineer and cloud computing enthusiast','2026-03-14 13:28:50'),(20,'22IT03','aditya.s@college.edu','hashed_pw_13','Aditya','Sharma','Information Technology','https://linkedin.com/in/aditya-sharma','https://github.com/adityas','Blockchain developer and Web3 enthusiast','2026-03-14 13:28:50'),(22,'2401ME63','harsha@iitp.ac.in','$2b$10$XrySnCOl03hnae5vuUQ9S.aKiLIInmTW3ZHg4D29JE45XBhPjabC.','harsha','bhati','Mechanical','https://www.linkedin.com/in/ashray-khairnar-376810321/',NULL,'i am roommate of a great man','2026-03-17 12:29:19'),(23,'2403mc04','leon_2403mc04@iitp.ac.in','$2b$10$rE52WqxCpZEI/LsKvAuJX.vNUhPK0u.t5MrTjBdRpAAtRHYuE7gua','Leon','Joel','Mathematics',NULL,NULL,NULL,'2026-03-19 16:07:39');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-23 15:25:08

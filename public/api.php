<?php
/**
 * ==============================================================================
 *                     EasyDriver API Central Gateway
 * ==============================================================================
 * This file is the central gateway proxy redirector which delegates all production 
 * requests to our modern, secure MVC-styled PHP backend routing system located under 
 * public/api/index.php.
 */

require_once __DIR__ . '/api/index.php';

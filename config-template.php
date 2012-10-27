<?php

$host = "localhost"; // Host name 
$username = "XXXX"; // Mysql username 
$password = "XXXX"; // Mysql password 
$db_name = "geeoh"; // Database name 

// MySQL-DB tables
$tbl_registered = "registered_members";
$tbl_temporary = "temp_members_db";

//Connect to server and select database.
mysql_connect("$host", "$username", "$password") or die("cannot connect to server"); 
mysql_select_db("$db_name") or die("cannot select DB");

$signin_conf = Array();
$signin_conf['web-site'] = "http://XXX";
$signin_conf['email-header'] = "" .
    "From: GEEOH administrator <XXX@YYY.ZZZ>" .
    "\r\nReply-To: DoNotReply";
$signin_conf['tbl-reg'] = $tbl_registered;
$signin_conf['tbl-temp'] = $tbl_temporary;
$signin_conf['cgi-dir'] = "/XXX/cgi-bin";
$signin_conf['user-data'] = "/XXXX/geeoh/users";
$signin_conf['geeoh-bindir'] = "/XXXX/geeoh/bin";

?>

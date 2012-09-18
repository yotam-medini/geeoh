<?php

include('config.php');

$name = mysql_real_escape_string($_POST['name']);
$pw = mysql_real_escape_string(sha1($_POST['password']));

echo "name: $name , pw: $pw";
// $sql = "SELECT * FROM $tbl_registered WHERE binary name = '$name'";
?>

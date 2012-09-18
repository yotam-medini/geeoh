<?php
session_start();
include('config.php');

function post_value($key) {
    $ret = "";
    if (isset($_POST[$key])) {
        $ret = $_POST[$key]; 
    }
    return $ret;
}

$action = mysql_real_escape_string(post_value('action'));
$name = mysql_real_escape_string(post_value('name'));
$pw = mysql_real_escape_string(sha1(post_value('pw')));

// if (!isset($_SESSION['login'])) {
//     $_SESSION['login'] = 0;
// }
// $login_count = $_SESSION['login']++;

// echo "name: $name , pw: $pw login_count=$login_count";
// system("cgi-bin/callshow.py $login_count", $retval);
// echo "retval=$retval";
$tbl_registered = "registered_members";

$sql = "SELECT * FROM $tbl_registered WHERE binary name = '$name' AND  binary password = '$pw'";
$result = mysql_query($sql);
$count = 0;
if ($result) {
    $count = mysql_num_rows($result);
    if ($count == 1) {
        $_SESSION['login'] = 1;
        echo "ok";
    } else {
        echo "error: Signing in failed";
    }
} else {
    echo "error: SQL query failed";
}

?>

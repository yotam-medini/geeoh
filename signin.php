<?php
session_start();
require_once('config.php');

function post_value($key) {
    $ret = "";
    if (isset($_POST[$key])) {
        $ret = $_POST[$key]; 
    }
    return $ret;
}

function generate_random_string($len) {
    // Python's: string.letters + string.digits
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    $chars_len = strlen($chars);
    $pw = "";
    $pw_len = 0;
    while ($pw_len < $len) {
        $ci = mt_rand(0, $chars_len - 1);
        $pw .= substr($chars, $ci, 1);
        $pw_len++;
        $chars = substr($chars, 0, $ci) . substr($chars, $ci + 1);
        $chars_len--;
    }
    return $pw;
}

function email_send($email, $confirm_code, $pw) {
    $subject = "Your GEEOH confirmation link here";
    $header = "From: GEEOH administrator <yotam.medini@gmail.com>";
    // $header .= "\r\nReply-To: DoNotReply";
    $message = "Your Comfirmation link \r\n";
    $message .= "Click on this link to activate your account \r\n";
    $message .= "http://localhost/~yotam/geeoh/confirm.php?passkey=$confirm_code";
    if ($pw) {
        $message .= "\r\nWith new password: $pw";
    }

    return mail($email, $subject, $message, $header);
}

$action = mysql_real_escape_string(post_value('action'));
$name = mysql_real_escape_string(post_value('name'));
$email = mysql_real_escape_string(post_value('email'));
$pw = mysql_real_escape_string(sha1(post_value('pw')));

if ($action === "signin") {
    $sql = "SELECT * FROM $tbl_registered "
       . "WHERE binary name = '$name' AND  binary password = '$pw'";
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
} else if ($action === "signout") {
    $_SESSION['login'] = false;
    echo "login := false"; 
} else if ($action === "reset") {
    // echo "reset: email=$email";
    $_SESSION['login'] = false;
    $sql = "SELECT * FROM $tbl_registered WHERE email = '$email'";
    $result = mysql_query($sql);
    $count = 0;
    if ($result) {
	$count = mysql_num_rows($result);
        // echo "count=$count, result=$result";
        if ($count == 1) {
            $rows = mysql_fetch_array($result);
            $name = $rows['name'];
            $email = $rows['email'];
            $confirm_code = md5(uniqid(rand()));
            $gen_pw = generate_random_string(8);
            $member_pw = sha1($gen_pw);
            $now = time();
            $sql = "INSERT INTO $tbl_temporary" .
                "(confirm_code, name, email, password, time)" .
                "VALUES('$confirm_code', '$name', '$email', '$member_pw', $now)";
            $result = mysql_query($sql);
            if ($result) {
                if (email_send($email, $confirm_code, $gen_pw)) {
                    echo "reset sent, gen_pw=$gen_pw";
                } else {
                    echo "error: Email sending failed";
                }
            } else {
                echo "error: Failed to insert confirmatiom code";
            }
        } else {
            echo "error: E-mail address not found"; 
        }
    } else {
        echo "error: SQL query failed"; 
    }
} else {
    $_SESSION['login'] = false;
    echo "error: Bad action: $action"; 
}

?>

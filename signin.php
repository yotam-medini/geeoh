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

function email_send($signin_conf, $to, $confirm_code, $gen_pw) {
    $subject = "Your GEEOH confirmation link here";
    $message = "Your Comfirmation link \r\n";
    $message .= "Click on this link to activate your account \r\n";
    $message .= $signin_conf['web-site'];
    $message .= "/confirm.php?passkey=$confirm_code";
    if ($gen_pw) {
        $message .= "\r\nWith new password: $gen_pw";
    }

    return mail($to, $subject, $message, $signin_conf['email-header']);
}

function email_by_name($signin_conf, $name, $message) {
    $tbl = $signin_conf['tbl-reg'];
    $sql = "SELECT * FROM $tbl WHERE binary name = '$name'";
    $result = mysql_query($sql);
    $count = ($result) ? mysql_num_rows($result) : -1;
    if ($count == 1) {
        $rows = mysql_fetch_array($result);
        $to = $rows['email'];
        mail($to, "GEEOH request done", $message, $signin_conf['email-header']);
    }
}

function set_temporary_confirm($signin_conf, $name, $to, $user_pw, $fdbg=null) {
    $ok = false;
    $pw = $user_pw;
    $gen_pw = null;
    if (is_null($user_pw)) {
        $pw = $gen_pw = generate_random_string(8);
    }
    $pw_encypted = sha1($pw);
    if ($fdbg) { fprintf($fdbg, "stc: pw_encypted=$pw_encypted\n"); }
    $confirm_code = md5(uniqid(rand()));
    $now = time();
    $tbl = $signin_conf['tbl-temp'];
if ($fdbg) { fprintf($fdbg, "stc: 1, tbl=$tbl\n"); }
    $sql = "INSERT INTO $tbl " .
        "(confirm_code, name, email, password, time)" .
        "VALUES('$confirm_code', '$name', '$to', '$pw_encypted', $now)";
    $result = mysql_query($sql);
if ($fdbg) { fprintf($fdbg, "stc: 2: result=$result\n"); }
    if ($result) {
        if (email_send($signin_conf, $to, $confirm_code, $gen_pw)) {
            echo "reset sent"; // gen_pw=$gen_pw";
        } else {
            echo "error: Email sending failed";
        }
    } else {
        echo "error: Failed to insert confirmatiom code";
    }
$e = error_get_last();
if ($fdbg) { fprintf($fdbg, "stc: 3, error=$e\n"); }
}

$action = mysql_real_escape_string(post_value('action'));
$name = mysql_real_escape_string(post_value('name'));
$email = mysql_real_escape_string(post_value('email'));
$user_pw = post_value('pw');

$fdbg = fopen("/tmp/signin-php.log", "a");
$now = date("Y-m-d H:i:s");
fprintf($fdbg, "\n$now\naction=$action, user_pw=$user_pw\n");

if ($action === "signin") {
    $pw_encypted = sha1($user_pw);
    fprintf($fdbg, "pw_encypted=$pw_encypted\n");
    $sql = "SELECT * FROM $tbl_registered "
       . "WHERE binary name = '$name' AND  binary password = '$pw_encypted'";
    $result = mysql_query($sql);
    $count = 0;
    if ($result) {
	$count = mysql_num_rows($result);
	if ($count == 1) {
	    $_SESSION['login'] = 1;
	    $_SESSION['name'] = $name;
	    echo "ok";
	} else {
	    echo "error: Signing in failed";
	}
    } else {
	echo "error: SQL query failed";
    }
} else if ($action === "signout") {
    $_SESSION['login'] = false;
    $_SESSION['name'] = null;
    echo "login := false"; 
} else if ($action === "signup") {
    $_SESSION['login'] = false;
    $_SESSION['name'] = null;
    $sql = "SELECT * FROM $tbl_registered WHERE binary name ='$name'" .
        " or email = '$email'";
    $result = mysql_query($sql);
    $count = 0;
    if ($result) {
	$count = mysql_num_rows($result);
        if ($count == 0) {
            set_temporary_confirm($signin_conf, $name, $email, $user_pw,
                $fdbg);
        } else {
            echo "error: name or e-mail already registered"; 
        }
    } else {
        echo "error: SQL query failed"; 
    }
 if ($fdbg) { fprintf($fdbg, "signup END: 2\n"); }
} else if ($action === "reset") {
    // echo "reset: email=$email";
    $_SESSION['login'] = false;
    $_SESSION['name'] = null;
    $sql = "SELECT * FROM $tbl_registered WHERE email = '$email'";
    $result = mysql_query($sql);
    $count = -1;
    if ($result) {
	$count = mysql_num_rows($result);
        // echo "count=$count, result=$result";
        if ($count == 1) {
            $rows = mysql_fetch_array($result);
            $name = $rows['name'];
            $email = $rows['email'];
            set_temporary_confirm($signin_conf, $name, $email, null);
        } else {
            echo "error: E-mail address not found"; 
        }
    } else {
        echo "error: SQL query failed"; 
    }
} else if ($action === "pwnew") {
    if ($fdbg) { fprintf($fdbg, "pwnew: \n"); }
    if ($name === $_SESSION['name']) {
        email_by_name($signin_conf, $name,
            "Your password for account '$name' is changed as requested");
        $pw_encypted = sha1($user_pw);
        $sql = "UPDATE $tbl_registered SET password = '$pw_encypted' " .
            "WHERE binary name = '$name'";
        $result = mysql_query($sql);
        if ($fdbg) { fprintf($fdbg, "result " . ($result ? "1" : "0") ."\n"); }
    } else {    
        echo "error: logged user differ";
    }
} else if ($action === "remove") {
    if ($name === $_SESSION['name']) {
        email_by_name($signin_conf, $name, 
            "Your account '$name' is removed as requested");
        $sql = "DELETE FROM $tbl_registered WHERE binary name ='$name'";
        $result = mysql_query($sql);
    }
} else {
    $_SESSION['login'] = false;
    $_SESSION['name'] = null;
    echo "error: Bad action: $action"; 
}

if ($fdbg) {
    $now = date("Y-m-d H:i:s");
    fprintf($fdbg, "$now Exit\n");
}

?>

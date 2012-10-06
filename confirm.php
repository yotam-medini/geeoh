<?php

include('config.php');

// Passkey that got from link 
$passkey   = $_GET['passkey'];

$sql = "SELECT * FROM $tbl_temporary WHERE confirm_code ='$passkey'";
$result = mysql_query($sql);

$count = -1;
if ($result) {
    $count = mysql_num_rows($result);
}
if ($count == 1) {
    $rows      = mysql_fetch_array($result);
    $name      = $rows['name'];
    $email     = $rows['email'];
    $password  = $rows['password'];

    $mkdir_ud = $signin_conf['cgi-dir'] . "/geeoh-io.cgi " .
        "-user $name -mkdir $name";
    # echo $mkdir_ud;
    exec($mkdir_ud, $output, $rc);
    // foreach ($output as $line) { echo "$line\n"; } echo "... rc=$rc\n";
    if ($rc == 0) {
        // Delete old record. 
        // Ignore failure that should happen for new registration.
        $sql = "DELETE FROM $tbl_registered WHERE binary name ='$name'" .
            " or email = '$email'";
        $sql = "INSERT INTO $tbl_registered(name, email, password)" .
            "VALUES('$name', '$email', '$password')";
        $result = mysql_query($sql);
        if ($result) {
            echo "Your new password is activated.";
            $sql = "DELETE FROM $tbl_temporary WHERE confirm_code = '$passkey'";
            mysql_query($sql); // should not fail, but ignore if it does.
        }
    } else {
        echo "Failed: $mkdir_ud";
    }
} else {
    echo "Confirmation key not found, count=$count";
}
?>

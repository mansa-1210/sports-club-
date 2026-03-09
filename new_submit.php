<?php
require '../../include/db_conn.php';
page_protect();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Sanitize inputs
    $memID   = $_POST['m_id'] ?? null;
    $uname   = $_POST['u_name'] ?? '';
    $stname  = $_POST['street_name'] ?? '';
    $city    = $_POST['city'] ?? '';
    $zipcode = $_POST['zipcode'] ?? '';
    $state   = $_POST['state'] ?? '';
    $gender  = $_POST['gender'] ?? '';
    $dob     = $_POST['dob'] ?? '';
    $phn     = $_POST['mobile'] ?? '';
    $email   = $_POST['email'] ?? '';
    $jdate   = $_POST['jdate'] ?? '';
    $plan    = $_POST['plan'] ?? '';

    if (empty($memID)) {
        die("Error: Member ID is missing.");
    }

    // Start transaction
    $con->begin_transaction();
    try {
        // Insert into users
        $stmt = $con->prepare("INSERT INTO users(username, gender, mobile, email, dob, joining_date, userid) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssi", $uname, $gender, $phn, $email, $dob, $jdate, $memID);
        $stmt->execute();

        // Get plan details
        $stmt = $con->prepare("SELECT * FROM plan WHERE pid = ?");
        $stmt->bind_param("s", $plan);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            throw new Exception("Invalid plan selected.");
        }
        $planData = $result->fetch_assoc();
        $months = (int) $planData['validity'];

        date_default_timezone_set("Asia/Calcutta");
        $cdate = date("Y-m-d");
        $expiredate = date("Y-m-d", strtotime("+$months months"));

        // Insert into enrolls_to
        $stmt = $con->prepare("INSERT INTO enrolls_to(pid, uid, paid_date, expire, renewal) VALUES (?, ?, ?, ?, 'yes')");
        $stmt->bind_param("siss", $plan, $memID, $cdate, $expiredate);
        $stmt->execute();

        // Insert into health_status
        $stmt = $con->prepare("INSERT INTO health_status(uid) VALUES (?)");
        $stmt->bind_param("i", $memID);
        $stmt->execute();

        // Insert into address
        $stmt = $con->prepare("INSERT INTO address(id, streetName, state, city, zipcode) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("issss", $memID, $stname, $state, $city, $zipcode);
        $stmt->execute();

        // Commit transaction
        $con->commit();

        echo "<head><script>alert('Member Added Successfully');</script></head></html>";
        echo "<meta http-equiv='refresh' content='0; url=new_entry.php'>";
        exit;
    } catch (Exception $e) {
        $con->rollback();
        echo "<head><script>alert('Member Add Failed: " . $e->getMessage() . "');</script></head></html>";
        error_log("Error adding member: " . $e->getMessage());
    }
} else {
    echo "Invalid request method.";
}
?>

<?php
$lines = file('data/bank/Tide Current Account_03_Apr_2026_14.26.56.csv');
$lines[0] = preg_replace('/^\xEF\xBB\xBF/', '', $lines[0]); // strip UTF-8 BOM
$rawHeaders = str_getcsv(trim($lines[0]));
$headers = array_map(fn($h) => strtolower(trim($h, " \t\r\n\"'")), $rawHeaders);

function colIdx(array $headers, array $terms) {
    foreach ($terms as $t) {
        $idx = array_search($t, $headers);
        if ($idx !== false) return $idx;
    }
    foreach ($terms as $t) {
        foreach ($headers as $i => $h) {
            if (str_contains($h, $t)) return $i;
        }
    }
    return -1;
}

echo "Date: " . colIdx($headers, ['date']) . "\n";
echo "In: " . colIdx($headers, ['paid in','credit','deposit','received','money in']) . "\n";
echo "Out: " . colIdx($headers, ['paid out','debit','payment','withdrawn','money out']) . "\n";

print_r($headers);
?>

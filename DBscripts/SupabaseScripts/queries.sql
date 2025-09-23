--•Lists the total number of subscriptions status
SELECT status, COUNT(*) AS total_subscriptions
FROM Subscription
GROUP BY status
ORDER BY status;



--•	Show invoices with project owner emails
SELECT status, COUNT(*) AS total_invoices
FROM Invoice
GROUP BY status
ORDER BY status;



-- Top recent project exports
SELECT p.title,
       e.status,
       e.format,
       e.updated_at
FROM Project p
JOIN ExportFile e ON p.project_ID = e.project_ID
ORDER BY e.updated_at DESC
LIMIT 10;


async function main() {
  // Test POST endpoint
  const res = await fetch("https://tikwm.com/api/user/info", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://tikwm.com/",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
    },
    body: "unique_id=charlidamelio",
  });
  console.log("POST status:", res.status);
  const text = await res.text();
  console.log(text.slice(0, 400));
}
main().catch(console.error);

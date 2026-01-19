// Browser console script to extract level images from Arduboy forum page
//
// Instructions:
// 1. Open https://community.arduboy.com/t/lode-runner-game-1-levels/5395 in your browser
// 2. Open Developer Tools (F12 or Cmd+Option+I)
// 3. Go to the Console tab
// 4. Paste this entire script and press Enter
// 5. It will log the image URLs and offer to download them

(function() {
  // Find all images in the post content
  const images = document.querySelectorAll('.cooked img, .post-stream img');
  const imageUrls = [];

  images.forEach((img, index) => {
    let url = img.src || img.dataset.src || img.dataset.smallUpload;
    if (url && !url.includes('avatar') && !url.includes('emoji') && !url.includes('user_avatar')) {
      // Make sure it's a full URL
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (url.startsWith('/')) {
        url = window.location.origin + url;
      }
      imageUrls.push(url);
    }
  });

  console.log('Found ' + imageUrls.length + ' level images:');
  console.log(imageUrls.join('\n'));

  // Create a text file with all URLs for easy downloading
  const urlList = imageUrls.join('\n');
  const blob = new Blob([urlList], { type: 'text/plain' });
  const downloadUrl = URL.createObjectURL(blob);

  // Create download link
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'lode-runner-level-urls.txt';
  a.textContent = 'Click to download URL list';
  a.style.cssText = 'position:fixed;top:10px;right:10px;padding:10px 20px;background:#4CAF50;color:white;border-radius:5px;z-index:99999;font-size:16px;';
  document.body.appendChild(a);

  // Also offer to download all images
  console.log('\n--- To download all images, you can use curl or wget ---');
  console.log('Copy the URLs above and use:');
  console.log('  curl -O <url>');
  console.log('Or save the URL list and use:');
  console.log('  xargs -n 1 curl -O < lode-runner-level-urls.txt');

  // Return the URLs for easy copying
  return imageUrls;
})();

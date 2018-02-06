# Build note

__To build add-on for Chrome, follow the procedure below.__

1. Copy and paste key.pem into ./src/
2. Zip the contents of src directory by:  
  ```
  cd ./src
  zip systrade_chrome-0.0.x.zip -r ./*
  ```
3. Upload to [Chrome developer site](https://chrome.google.com/webstore/developer/dashboard)

__To build add-on for Firefox, follow the procedure below.__  
1. Remove key.pem if it exists under ./src  
2. Dispatch build tool
  ```
  yarn run build
  ```
3. Upload add-on file to [AMO](https://addons.mozilla.org/ja/developers/addons)

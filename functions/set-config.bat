@echo off
REM Replace these placeholder values with your actual Twilio credentials
firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID" twilio.auth_token="YOUR_AUTH_TOKEN" twilio.api_key="YOUR_API_KEY" twilio.api_secret="YOUR_API_SECRET" twilio.twiml_app_sid="YOUR_TWIML_APP_SID" twilio.phone_number="YOUR_PHONE_NUMBER"
echo Done setting Twilio config!
pause

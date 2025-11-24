-- Store Agora credentials securely in the database
-- These will be used by the Edge Function to generate tokens

-- Update Agora App ID
UPDATE app_config 
SET config_value = 'afb56a8abe2442ee8bc5b46e8ede106c'
WHERE config_key = 'agora_app_id';

-- Update Agora App Certificate
UPDATE app_config 
SET config_value = 'ecba9ebc6614484792d84e9a0f3b09cc'
WHERE config_key = 'agora_app_certificate';

-- Verify the values were set
SELECT config_key, 
       CASE 
         WHEN config_key = 'agora_app_certificate' THEN '***HIDDEN***'
         ELSE config_value 
       END as config_value,
       description
FROM app_config
WHERE config_key IN ('agora_app_id', 'agora_app_certificate');


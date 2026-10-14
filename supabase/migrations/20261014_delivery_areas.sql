insert into public.settings (key, value) values
  ('delivery_cities', '["Mau","Bhiti","Muhamdabaad","Ghosi"]'::jsonb),
  ('delivery_pincodes', '["123456","456781","346578","432987"]'::jsonb)
on conflict (key) do nothing;

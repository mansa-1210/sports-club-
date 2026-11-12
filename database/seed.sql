INSERT INTO public.sports (user_id, name, slug, summary, description, image_url, is_active, sort_order)
VALUES
  ('system-seed', 'Cricket', 'cricket', 'Nets, leagues and coaching', 'Nets, leagues and coaching', '/sports-images/cricket.png', true, 1),
  ('system-seed', 'Football', 'football', 'Five-a-side to full pitch', 'Five-a-side to full pitch', '/sports-images/football.png', true, 2),
  ('system-seed', 'Basketball', 'basketball', 'Fast games. Big energy.', 'Fast games. Big energy.', '/sports-images/basketball.png', true, 3),
  ('system-seed', 'Badminton', 'badminton', 'Court time, your pace', 'Court time, your pace', '/sports-images/badminton.png', true, 4),
  ('system-seed', 'Tennis', 'tennis', 'Technique meets intensity', 'Technique meets intensity', '/sports-images/tennis.png', true, 5),
  ('system-seed', 'Swimming', 'swimming', 'Find your rhythm', 'Find your rhythm', '/sports-images/swimming.png', true, 6),
  ('system-seed', 'Volleyball', 'volleyball', 'Play up, play together', 'Play up, play together', '/sports-images/volleyball.png', true, 7),
  ('system-seed', 'Gym & Fitness', 'fitness', 'Strength for real life', 'Strength for real life', '/sports-images/fitness.png', true, 8),
  ('system-seed', 'Athletics', 'athletics', 'Track your potential', 'Track your potential', '/sports-images/athletics.png', true, 9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.membership_plans (user_id, name, slug, description, price_minor, currency, duration_days, features, is_active)
VALUES
  ('system-seed', 'Basic', 'basic', 'A flexible entry plan for everyday training.', 199900, 'INR', 30, '["Gym floor access", "Locker room access", "2 group classes / month"]'::jsonb, true),
  ('system-seed', 'Premium', 'premium', 'More room to train across the club.', 349900, 'INR', 30, '["Full club access", "Unlimited group classes", "Pool + court bookings"]'::jsonb, true),
  ('system-seed', 'Elite', 'elite', 'A more supported training experience.', 699900, 'INR', 30, '["Everything in Premium", "2 personal training sessions", "Priority event registration"]'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

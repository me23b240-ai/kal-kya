-- Mock data only. protein_g is intentionally left NULL.
insert into households (id, name, mode)
values ('a0000000-0000-0000-0000-000000000001', 'Demo Family', 'family')
on conflict (id) do nothing;

insert into members (id, household_id, name, is_cook, turn_order) values
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Mom',    true,  1),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','Dad',    false, 2),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','Sister', false, 3),
 ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','Me',     false, 4)
on conflict (id) do nothing;

update households
set turn_member_id = 'b0000000-0000-0000-0000-000000000001'
where id = 'a0000000-0000-0000-0000-000000000001';

insert into dishes (id, name, name_hi, ingredients, contains, is_mock) values
 ('c0000000-0000-0000-0000-000000000001','Aloo Gobi','आलू गोभी',
  '[{"item":"potato","qty":"3 medium"},{"item":"cauliflower","qty":"1 small"},{"item":"onion","qty":"1"},{"item":"turmeric","qty":"1 tsp"}]',
  '{aloo,gobi}', true),
 ('c0000000-0000-0000-0000-000000000002','Dal Tadka','दाल तड़का',
  '[{"item":"toor dal","qty":"1 cup"},{"item":"tomato","qty":"2"},{"item":"garlic","qty":"4 cloves"},{"item":"ghee","qty":"2 tbsp"}]',
  '{dal,ghee}', true),
 ('c0000000-0000-0000-0000-000000000003','Paneer Butter Masala','पनीर बटर मसाला',
  '[{"item":"paneer","qty":"250 g"},{"item":"tomato","qty":"4"},{"item":"butter","qty":"2 tbsp"},{"item":"cream","qty":"3 tbsp"}]',
  '{paneer,dairy,butter,cream}', true),
 ('c0000000-0000-0000-0000-000000000004','Rajma Chawal','राजमा चावल',
  '[{"item":"rajma","qty":"1 cup"},{"item":"rice","qty":"1.5 cups"},{"item":"onion","qty":"2"},{"item":"tomato","qty":"2"}]',
  '{rajma,rice}', true),
 ('c0000000-0000-0000-0000-000000000005','Chole','छोले',
  '[{"item":"chickpeas","qty":"1.5 cups"},{"item":"onion","qty":"2"},{"item":"tomato","qty":"2"},{"item":"chole masala","qty":"2 tbsp"}]',
  '{chana}', true),
 ('c0000000-0000-0000-0000-000000000006','Bhindi Masala','भिंडी मसाला',
  '[{"item":"okra","qty":"300 g"},{"item":"onion","qty":"1"},{"item":"amchur","qty":"1 tsp"}]',
  '{bhindi}', true),
 ('c0000000-0000-0000-0000-000000000007','Veg Pulao','वेज पुलाव',
  '[{"item":"basmati rice","qty":"1.5 cups"},{"item":"peas","qty":"0.5 cup"},{"item":"carrot","qty":"1"},{"item":"whole spices","qty":"1 tbsp"}]',
  '{rice,peas}', true),
 ('c0000000-0000-0000-0000-000000000008','Palak Paneer','पालक पनीर',
  '[{"item":"spinach","qty":"2 bunches"},{"item":"paneer","qty":"200 g"},{"item":"onion","qty":"1"},{"item":"garlic","qty":"4 cloves"}]',
  '{palak,paneer,dairy}', true)
on conflict (id) do nothing;
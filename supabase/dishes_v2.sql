-- Stage: dish seed expansion to 40 dishes, image/meal_style columns, member avatars.
-- Run once in the Supabase SQL Editor, after schema.sql, seed.sql and stage2.sql.
-- DEMO ONLY: RLS stays off on these tables (see schema.sql).

alter table dishes add column if not exists meal_style text not null default 'with_staples'
  check (meal_style in ('with_staples','complete'));
alter table dishes add column if not exists image_url text;
alter table dishes add column if not exists image_credit text;
alter table dishes add column if not exists recipe_steps text;
alter table dishes add column if not exists recipe_link text;

alter table members add column if not exists avatar_url text;

alter table households add column if not exists staples text[] not null
  default '{rice,atta,toor dal,oil,salt,turmeric,red chilli powder}';

-- Existing 8: set meal_style + image path, never touch ingredients/contains.
update dishes set meal_style = 'complete',      image_url = '/dishes/dal-tadka.png'            where id = 'c0000000-0000-0000-0000-000000000002';
update dishes set meal_style = 'with_staples',  image_url = '/dishes/aloo-gobi.png'             where id = 'c0000000-0000-0000-0000-000000000001';
update dishes set meal_style = 'with_staples',  image_url = '/dishes/paneer-butter-masala.png'  where id = 'c0000000-0000-0000-0000-000000000003';
update dishes set meal_style = 'complete',      image_url = '/dishes/rajma-chawal.png'          where id = 'c0000000-0000-0000-0000-000000000004';
update dishes set meal_style = 'with_staples',  image_url = '/dishes/chole.png'                 where id = 'c0000000-0000-0000-0000-000000000005';
update dishes set meal_style = 'with_staples',  image_url = '/dishes/bhindi-masala.png'         where id = 'c0000000-0000-0000-0000-000000000006';
update dishes set meal_style = 'complete',      image_url = '/dishes/veg-pulao.png'             where id = 'c0000000-0000-0000-0000-000000000007';
update dishes set meal_style = 'with_staples',  image_url = '/dishes/palak-paneer.png'          where id = 'c0000000-0000-0000-0000-000000000008';

-- New 32. Stable ids, idempotent.
insert into dishes (id, name, name_hi, ingredients, contains, meal_style, image_url, is_mock) values
('c0000000-0000-0000-0000-000000000009','Aloo Matar','आलू मटर',
 '[{"item":"potato","qty":"3 medium"},{"item":"peas","qty":"1 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"}]',
 '{aloo,matar}','with_staples','/dishes/aloo-matar.png', true),
('c0000000-0000-0000-0000-000000000010','Aloo Jeera','आलू जीरा',
 '[{"item":"potato","qty":"4 medium"},{"item":"cumin seeds","qty":"1 tsp"},{"item":"green chilli","qty":"2"}]',
 '{aloo,jeera}','with_staples','/dishes/aloo-jeera.png', true),
('c0000000-0000-0000-0000-000000000011','Dum Aloo','दम आलू',
 '[{"item":"potato","qty":"500 g baby potatoes"},{"item":"curd","qty":"0.5 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"},{"item":"ginger","qty":"1 inch"}]',
 '{aloo,dairy}','with_staples','/dishes/dum-aloo.png', true),
('c0000000-0000-0000-0000-000000000012','Gobi Matar','गोभी मटर',
 '[{"item":"cauliflower","qty":"1 medium"},{"item":"peas","qty":"1 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"1"}]',
 '{gobi,matar}','with_staples','/dishes/gobi-matar.png', true),
('c0000000-0000-0000-0000-000000000013','Baingan Bharta','बैंगन भरता',
 '[{"item":"brinjal","qty":"2 large"},{"item":"onion","qty":"2"},{"item":"tomato","qty":"2"},{"item":"garlic","qty":"4 cloves"}]',
 '{baingan}','with_staples','/dishes/baingan-bharta.png', true),
('c0000000-0000-0000-0000-000000000014','Lauki Sabji','लौकी सब्जी',
 '[{"item":"bottle gourd","qty":"1 medium"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"1"},{"item":"cumin seeds","qty":"1 tsp"}]',
 '{lauki}','with_staples','/dishes/lauki-sabji.png', true),
('c0000000-0000-0000-0000-000000000015','Tinda Masala','टिंडा मसाला',
 '[{"item":"round gourd","qty":"4 medium"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"},{"item":"ginger","qty":"1 inch"}]',
 '{tinda}','with_staples','/dishes/tinda-masala.png', true),
('c0000000-0000-0000-0000-000000000016','Tendli Fry','टेंडली फ्राई',
 '[{"item":"ivy gourd","qty":"250 g"},{"item":"onion","qty":"1"},{"item":"mustard seeds","qty":"1 tsp"}]',
 '{tendli}','with_staples','/dishes/tendli-fry.png', true),
('c0000000-0000-0000-0000-000000000017','Karela Fry','करेला फ्राई',
 '[{"item":"bitter gourd","qty":"300 g"},{"item":"onion","qty":"1"},{"item":"besan","qty":"1 tbsp"}]',
 '{karela,besan}','with_staples','/dishes/karela-fry.png', true),
('c0000000-0000-0000-0000-000000000018','Cabbage Sabji','पत्तागोभी सब्जी',
 '[{"item":"cabbage","qty":"0.5 medium head"},{"item":"onion","qty":"1"},{"item":"mustard seeds","qty":"1 tsp"},{"item":"green chilli","qty":"1"}]',
 '{cabbage}','with_staples','/dishes/cabbage-sabji.png', true),
('c0000000-0000-0000-0000-000000000019','Beans Poriyal','बीन्स पोरियल',
 '[{"item":"beans","qty":"250 g"},{"item":"coconut","qty":"2 tbsp grated"},{"item":"mustard seeds","qty":"1 tsp"}]',
 '{beans,coconut}','with_staples','/dishes/beans-poriyal.png', true),
('c0000000-0000-0000-0000-000000000020','Mixed Veg','मिक्स वेज',
 '[{"item":"potato","qty":"1"},{"item":"carrot","qty":"1"},{"item":"beans","qty":"10"},{"item":"peas","qty":"0.5 cup"},{"item":"cauliflower","qty":"0.5 small"}]',
 '{mixed,matar}','with_staples','/dishes/mixed-veg.png', true),
('c0000000-0000-0000-0000-000000000021','Matar Paneer','मटर पनीर',
 '[{"item":"paneer","qty":"200 g"},{"item":"peas","qty":"1 cup"},{"item":"tomato","qty":"3"},{"item":"onion","qty":"1"}]',
 '{matar,paneer,dairy}','with_staples','/dishes/matar-paneer.png', true),
('c0000000-0000-0000-0000-000000000022','Kadai Paneer','कड़ाही पनीर',
 '[{"item":"paneer","qty":"200 g"},{"item":"capsicum","qty":"2"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"}]',
 '{paneer,dairy,capsicum}','with_staples','/dishes/kadai-paneer.png', true),
('c0000000-0000-0000-0000-000000000023','Paneer Bhurji','पनीर भुर्जी',
 '[{"item":"paneer","qty":"250 g"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"1"},{"item":"capsicum","qty":"1"}]',
 '{paneer,dairy,capsicum}','with_staples','/dishes/paneer-bhurji.png', true),
('c0000000-0000-0000-0000-000000000024','Methi Aloo','मेथी आलू',
 '[{"item":"fenugreek leaves","qty":"1 bunch"},{"item":"potato","qty":"3 medium"},{"item":"onion","qty":"1"}]',
 '{methi,aloo}','with_staples','/dishes/methi-aloo.png', true),
('c0000000-0000-0000-0000-000000000025','Bhindi Fry','भिंडी फ्राई',
 '[{"item":"okra","qty":"300 g"},{"item":"onion","qty":"1"},{"item":"besan","qty":"1 tbsp"}]',
 '{bhindi,besan}','with_staples','/dishes/bhindi-fry.png', true),
('c0000000-0000-0000-0000-000000000026','Mushroom Masala','मशरूम मसाला',
 '[{"item":"mushroom","qty":"200 g"},{"item":"onion","qty":"2"},{"item":"tomato","qty":"2"},{"item":"ginger","qty":"1 inch"}]',
 '{mushroom}','with_staples','/dishes/mushroom-masala.png', true),
('c0000000-0000-0000-0000-000000000027','Kaddu Sabji','कद्दू सब्जी',
 '[{"item":"pumpkin","qty":"400 g"},{"item":"onion","qty":"1"},{"item":"cumin seeds","qty":"1 tsp"}]',
 '{kaddu}','with_staples','/dishes/kaddu-sabji.png', true),
('c0000000-0000-0000-0000-000000000028','Arbi Fry','अरबी फ्राई',
 '[{"item":"colocasia","qty":"300 g"},{"item":"besan","qty":"1 tbsp"},{"item":"chilli powder","qty":"1 tsp"}]',
 '{arbi,besan}','with_staples','/dishes/arbi-fry.png', true),
('c0000000-0000-0000-0000-000000000029','Soya Chunks Curry','सोया चंक्स करी',
 '[{"item":"soya chunks","qty":"1 cup"},{"item":"onion","qty":"2"},{"item":"tomato","qty":"2"},{"item":"ginger","qty":"1 inch"}]',
 '{soya}','with_staples','/dishes/soya-chunks-curry.png', true),
('c0000000-0000-0000-0000-000000000030','Capsicum Besan','शिमला मिर्च बेसन',
 '[{"item":"capsicum","qty":"3"},{"item":"besan","qty":"3 tbsp"},{"item":"onion","qty":"1"}]',
 '{capsicum,besan}','with_staples','/dishes/capsicum-besan.png', true),
('c0000000-0000-0000-0000-000000000031','Aloo Palak','आलू पालक',
 '[{"item":"potato","qty":"2 medium"},{"item":"spinach","qty":"1 bunch"},{"item":"onion","qty":"1"}]',
 '{aloo,palak}','with_staples','/dishes/aloo-palak.png', true),
('c0000000-0000-0000-0000-000000000032','Sev Tamatar','सेव टमाटर',
 '[{"item":"tomato","qty":"4"},{"item":"sev","qty":"1 cup"},{"item":"onion","qty":"1"}]',
 '{sev,tamatar}','with_staples','/dishes/sev-tamatar.png', true),
('c0000000-0000-0000-0000-000000000033','Moong Dal','मूंग दाल',
 '[{"item":"moong dal","qty":"1 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"1"},{"item":"garlic","qty":"3 cloves"}]',
 '{moong,dal}','with_staples','/dishes/moong-dal.png', true),
('c0000000-0000-0000-0000-000000000034','Chana Dal','चना दाल',
 '[{"item":"chana dal","qty":"1 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"},{"item":"garlic","qty":"3 cloves"}]',
 '{chana,dal}','with_staples','/dishes/chana-dal.png', true),
('c0000000-0000-0000-0000-000000000035','Masoor Dal','मसूर दाल',
 '[{"item":"masoor dal","qty":"1 cup"},{"item":"onion","qty":"1"},{"item":"tomato","qty":"2"},{"item":"garlic","qty":"3 cloves"}]',
 '{masoor,dal}','with_staples','/dishes/masoor-dal.png', true),
('c0000000-0000-0000-0000-000000000036','Sambar','सांबर',
 '[{"item":"toor dal","qty":"1 cup"},{"item":"tomato","qty":"2"},{"item":"tamarind","qty":"1 small ball"},{"item":"sambar powder","qty":"2 tbsp"}]',
 '{dal,tamarind}','with_staples','/dishes/sambar.png', true),
('c0000000-0000-0000-0000-000000000037','Kadhi Pakora','कढ़ी पकोड़ा',
 '[{"item":"curd","qty":"2 cups"},{"item":"besan","qty":"0.5 cup"},{"item":"onion","qty":"1"}]',
 '{dairy,besan}','with_staples','/dishes/kadhi-pakora.png', true),
('c0000000-0000-0000-0000-000000000038','Jeera Rice','जीरा राइस',
 '[{"item":"rice","qty":"2 cups"},{"item":"cumin seeds","qty":"1 tsp"},{"item":"ghee","qty":"1 tbsp"}]',
 '{jeera,rice,ghee}','complete','/dishes/jeera-rice.png', true),
('c0000000-0000-0000-0000-000000000039','Curd Rice','दही चावल',
 '[{"item":"rice","qty":"1 cup"},{"item":"curd","qty":"1.5 cups"},{"item":"mustard seeds","qty":"1 tsp"}]',
 '{rice,dairy}','complete','/dishes/curd-rice.png', true),
('c0000000-0000-0000-0000-000000000040','Khichdi','खिचड़ी',
 '[{"item":"rice","qty":"1 cup"},{"item":"moong dal","qty":"0.5 cup"},{"item":"ghee","qty":"1 tbsp"},{"item":"turmeric","qty":"0.5 tsp"}]',
 '{rice,dal,ghee}','complete','/dishes/khichdi.png', true)
on conflict (id) do nothing;

-- Demo family avatars (files already in public/avatars per your screenshot).
update members set avatar_url = '/avatars/mom.png'    where id = 'b0000000-0000-0000-0000-000000000001';
update members set avatar_url = '/avatars/dad.png'    where id = 'b0000000-0000-0000-0000-000000000002';
update members set avatar_url = '/avatars/sister.png' where id = 'b0000000-0000-0000-0000-000000000003';
update members set avatar_url = '/avatars/me.png'     where id = 'b0000000-0000-0000-0000-000000000004';

select meal_style, count(*) from dishes group by meal_style order by meal_style;

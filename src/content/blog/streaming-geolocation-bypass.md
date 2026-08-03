---
title: 'Streaming Platformunda Geolocation Bypass Denemesi'
description: 'Bir streaming platformunda coğrafi kısıtlamayı X-Forwarded-For başlığıyla nasıl aştığımı anlatan eğlenceli bir deneme.'
pubDate: 2026-04-18
tags: ['web', 'burpsuite', 'geolocation', 'bypass']
cover: '/covers/geolocation.jpg'
---

> **Sorumluluk Reddi:** Bu makalede anlatılan teknikler ve senaryolar tamamen eğitim ve siber güvenlik farkındalığı amaçlıdır. Hedef sistemin adı ve spesifik detayları etik kurallar gereği gizlenmiştir.
>
> *Disclaimer: The techniques and scenarios described in this article are intended solely for educational purposes and to raise cybersecurity awareness. The name of the target system and specific details have been withheld in accordance with ethical guidelines.*

Siber güvenlik ve yazılım dünyasının en sevdiği şey bence merak. Meraklı olan insan her gün yeni bir şey fark edip, deneyip öğrenebiliyor.

Geçtiğimiz günlerde biraz 80'ler nostaljisine sardım ve o zamanların korku filmlerini izlemeye başladım. Tabi günümüz streaming platformlarında öyle aradığın şeyi bulmak hiç kolay değil. Ben de ülkemiz dışında servis veren streaming platformlarını incelerken biraz arada kıyıda kalmış obscure bir site keşfettim. Sitede garip ve niş diyebileceğimiz bilimkurgu, korku eserleri vardı. Ben de merak edip bir izleyeyim dedim, nasıl olsa Amerika'da hizmet verse de UI gelmişti. Sonrasında bu tarz şeyleri deneyenlerin çok da iyi bildiği o yazıyla karşılaştım:

> This title is not available in your location.

Ben de merak edip Burp'ü açtım. Burp'ün tarayıcısından siteyi açtım ve "ne var ne yok, var mı bir location kontrolü ibaresi" derken tabi ki gözüme bir şey çarptı.

## Adım 1: Yanıltıcı Çözüm ve İlk Deneme

Trafiği incelediğimde, hedefin lokasyonumu doğrulamak için `geolocation.onetrust.com` adında third party bir API servisi kullandığını fark ettim. Bu servise giden isteğin karşılığında dönen yanıtta şu bilgiler yazıyordu:

```json
{ "country": "TR", "state": "34", "stateName": "Istanbul", "continent": "AS" }
```

Tabi bunu görünce hemen heyecanlandım. Burp Suite'in **"Match and Replace"** özelliğini kullanarak, Response Body kısmındaki bu TR yanıtını yakalayıp şu şekilde değiştirdim:

```json
{ "country": "US", "state": "CA", "stateName": "California", "continent": "NA" }
```

**Sonuç?** Kısmen başarılı. Sitenin arayüzündeki bazı kısıtlamalar kalktı ancak filmi oynatmak için Play'e bastığımda video başlamadı. Sitenin frontend'i bu JSON yanıtına kandı ancak arka plandaki Content Distribution Network bu hileyi yemedi.

## Adım 2: Asıl Hedefe Yönelmek (IP Spoofing)

Sorunun arayüzde değil, ağ seviyesinde olduğunu anlayınca internetten küçük bir araştırma yaptım ve aslında yıllardır kullanılan bir özelliği kullanabileceğimi fark ettim. Sistem, Load Balancer arkasında çalıştığı için gerçek IP adresimi kontrol etmek yerine belki de gelen HTTP başlıklarına güveniyordu.

Giden tüm isteklere bir ABD IP'si eklemek için meşhur kuralı yazdım:

```http
X-Forwarded-For: 104.16.132.229
```

Bu kuralı aktif edip tekrar denediğimde HTTP History'de video oynatıcısının asıl yayın listesini çektiği `GET /.../hls/master.m3u8` isteği sunucudan HTTP 200 OK koduyla dönmüştü. Sistem sahte Amerika IP'sini yutmuş olmasına rağmen ekranda hala `No compatible source was found` hatası alıyordum.

## Adım 3: Troubleshooting

Sunucu beni engellemiyorsa kim engelliyordu? Console sekmesinde böyle ilginç bir detayla karşılaştım:

```
otBannerSdk.js:7
Blocked script execution in 'about:blank' because the document's frame is sandboxed
and the 'allow-scripts' permission is not set.
```

Hedef platform filmi başlatmadan hemen önce bir reklam oynatıcısı çalıştırmaya çalışıyordu. Ben de bu test işlemleri için Burp'ün kendi tarayıcısını kullanıyordum. Bu tarayıcı, sonradan öğrendiğim üzere, bu tarz dış kaynaklı iframe scriptlerini sandbox içine alıp güvenlik sebebiyle bloke ediyordu.

Reklam oynatıcı çökünce, zincirleme bir reaksiyonla asıl video da "oynatacak kaynak bulamadım" diyerek hata veriyordu. Yani aslında **Geoblocking'i aşmıştım.**

## Adım 4: Son

Bu client taraflı engeli aşmak için Burp'ün sorunlu tarayıcısını kapattım. Normal tarayıcıma geçiş yaptım. Aslında proxy ayarlarıyla uğraşıp trafiği tekrar Burp üzerinden geçirebilirdim ama madem çözüm sadece basit bir HTTP başlığı eklemekti, Burp'e bile gerek kalmadığını fark ettim. Tarayıcıma **ModHeader** eklentisini kurdum. `X-Forwarded-For: 104.16.132.229` kuralını eklentiye girip sayfayı yenilediğimde reklam sorunsuzca oynadı ve ardından film başladı!

Evet, film gecesi ayağına küçük bir hack denemesi yapmış oldum. Benim için çok keyifli bir tecrübeydi. Asıl olay aşırı basit olan "X-Forwarded" trick'i olmasına rağmen bütün opsiyonları denemek ve gerçekten karşılaştığım bir problemi çözmek çok ayrı bir his.

Bu örnekte olan yayın platformu biraz küçük çaplı olduğu için güvenlik önlemleri yok denecek kadar az. Aynı yöntemler başka sitelerde büyük ihtimal işe yaramayabilir. Yine de, 2026 yılında hala request header ile bypass yapılması ilginç.

Okuduğunuz için teşekkürler, bir başka yazıda görüşmek üzere :)

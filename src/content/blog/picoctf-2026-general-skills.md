---
title: 'PicoCTF 2026 Write-up: General Skills Kategorisinde 6 Soru'
description: 'Bytemancy serisinden Failure Failure ve Absolute Nano’ya — picoCTF 2026 General Skills çözümleri.'
pubDate: 2026-03-20
tags: ['picoctf', 'ctf', 'writeup', 'pwntools', 'privilege-escalation']
cover: '/covers/picoctf-gen.png'
---

Merhabalar! picoCTF'i bu yıl yakalayabildim. Bu yazıda "General Skills" kategorisinden çözdüğüm birkaç soruyu anlatacağım. CTF dünyasında henüz yeni olduğum için çözerken hem çok eğlendim hem de gerçekten ufuk açıcı yeni şeyler öğrendim. Sözü fazla uzatmadan, 4 soruluk seri olan **Bytemancy** ile başlayalım.

## Bytemancy 0

![Bytemancy 0](/images/bytemancy0-question.png)

İlk sorumuz basit, netcat ile verilen serveri dinlediğimizde bize verilen bu Python code'unu çalıştırıyor.

![Bytemancy 0 source code](/images/bytemancy0-source.png)

Server bizden ASCII Decimal'de `101` değerine karşılık gelen karakteri 3 defa göndermemizi istiyor. Input kısmında da zaten `\x65` diyor — hexadecimalde de 65 karakterini istiyor aslında. Karakterimiz `e` harfi. Direkt flag elimizde.

![Bytemancy 0 flag](/images/bytemancy0-flag.png)

## Bytemancy 1

Gelelim bytemancy1'e. Bu sefer kodu incelediğimizde bizden **1751 kez** `e` karakterini istiyor.

![Bytemancy 1 source code](/images/bytemancy1-source.png)

1751 kez yazmak absürt olacağı için basit Python koduyla yollamaya çalıştım:

```bash
python3 -c "print('e' * 1751)"
```

ancak bu yazdığımı netcat cevap olarak algılıyor, hani benim 1751 tane e'm diyor. Ben de akıllılık edip Python ile nc'yi pipe'ladım ve dışarıdan yolladım isteğimi — ve flag elimizde.

![Bytemancy 1 flag](/images/bytemancy1-flag.png)

## Bytemancy 2

Şimdi gelelim bytemancy2'ye. Burada işler biraz ilginçleşiyor. Koda bakalım.

![Bytemancy 2 source code](/images/bytemancy2-source.png)

Benden istenilen `0xFF` karakteri (Decimal 255), standart ASCII tablosunda non-printable bir karakter. Klavyede buna karşılık gelen bir tuş yok. Verilen ipucunda pwntools'a bir gönderme vardı. Direkt sunucuya raw bytes gönderebilmek için şöyle bir Python kodu yazdım:

```python
from pwn import *

host = 'lonely-island.picoctf.net'
port = 54266

r = remote(host, port)

r.recvuntil(b'==> ')

r.sendline(b'\xff\xff\xff')

print(r.recvall().decode())
```

Bu kod sayesinde sunucuya otomatik bağlanıyorum. O ok işareti gelene kadar bekliyorum. Sonrasında 3 tane `0xff` byte'ını yolluyorum. Flag bizde.

![Bytemancy 2 flag](/images/bytemancy2-flag.png)

## Bytemancy 3

Şimdi anlatacağım bytemancy3 ise biraz bölüm sonu canavarı idi.

![Bytemancy 3 soru](/images/bytemancy3-question.png)

Bize verilen `spellbook` isimli çalıştırılabilir dosyanın kaynak kodunu incelediğimizde, önceki sorulardan farklı bir mekanizma görüyoruz. Sunucu bize statik bir byte sormuyor; içindeki 4 farklı C fonksiyonundan (`ember_sigil`, `glyph_conflux` vb.) rastgele birini seçip, hafıza adreslerini 4-byte *little-endian* formatında istiyor.

```c
// ... (önceki kısımlar)
selections = random.sample(SPELLBOOK_FUNCTIONS, QUESTION_COUNT)
success = True

for idx, symbol in enumerate(selections, 1):
    target_addr = elf.symbols[symbol]
    expected_bytes = p32(target_addr)

    print(f"[{idx}/{QUESTION_COUNT}] Send the 4-byte little-endian address for procedure '{symbol}'.")
    user_bytes = read_exact_bytes(len(expected_bytes))

    if user_bytes != expected_bytes:
        print("\nThose aren't the right runes.")
        success = False
        break
```

Yani sistem, adresi ELF dosyasının sembol tablosundan çekip `p32()` ile little-endian formatına çeviriyor. Yazacağımız scriptte biz de aynı metodu kullanacağız.

```python
from pwn import *
import re

elf = ELF('./spellbook')

host = 'foggy-cliff.picoctf.net'
port = 59727

r = remote(host, port)

for i in range(3):
    r.recvuntil(b"procedure '")

    func_name = r.recvuntil(b"'")[:-1].decode()
    print(f"\n[*] Sunucu soruyor: {func_name}")

    func_address = elf.symbols[func_name]
    print(f"[*] Bulunan adres: {hex(func_address)}")

    payload = p32(func_address)

    r.recvuntil(b"==> ")
    r.send(payload)

print("\n[+] Sonuç:")
print(r.recvall().decode())
```

Spellbook'u pwntools'a verdik. Sunucuya bağlandık. 3 tur boyunca fonksiyonun adresini ELF sembol tablosundan bul, adresi 4 byte Little-Endian raw byte'a çevir. Sonrasında bu Python kodunu çalıştırdığımızda flag elimizde.

![Bytemancy 3 flag](/images/bytemancy3-flag.png)

## Failure Failure

Bu soru bize gerçek dünyada çok sık yapılan bir High Availability yapılandırma hatasını gösteriyor. Siteye ilk girdiğimizde bizi "No flag in this service" yazısı karşılıyor. Kaynak kodunu incelediğimizde çok kritik bir detay var: Sistemde dakikada **300 Rate Limit** sınırı var ama bu sınır kullanıcı bazlı değil, global olarak ayarlanmış. Üstelik bu sınır aşılınca sistem standart 429 kodunu dönmek yerine **503 Service Unavailable** hatası veriyor.

![Failure Failure](/images/failure-failure.png)

```python
load_dotenv()

app = Flask(__name__)

# Custom key function for global rate limiting
def global_rate_limit_key():
    return "global"

# Initialize rate limiter with global key function
limiter = Limiter(
    key_func=global_rate_limit_key,
    app=app,
    default_limits=["300 per minute"]
)

# Custom error handler for rate limit exceeded
@app.errorhandler(429)
def ratelimit_exceeded(e):
    return "Service Unavailable: Rate limit exceeded", 503

@app.route('/')
@limiter.limit("300 per minute")
def home():
    print("value:", os.getenv("IS_BACKUP"))
    if os.getenv("IS_BACKUP") == "yes":
        flag = os.getenv("FLAG")
    else:
        flag = "No flag in this service"
    return render_template("index.html", flag=flag)
```

Araya konulan Yük Dengeleyici (HAProxy), ana sunucudan 503 hatası aldığında sunucunun çöktüğünü sanıp trafiği içinde bayrağın bulunduğu **Yedek sunucuya** yönlendiriyor. Yapmamız gereken tek şey ana sunucuyu isteğe boğup ölmüş gibi davranmasını sağlamak. Şu bash döngüsüyle arka arkaya 350 istek yolladım:

```bash
for i in {1..350}; do curl -s "http://mysterious-sea.picoctf.net:58541/" > /dev/null & done
```

Sayfayı yenilediğimde site beni yedek sunucuya attı. Flag de orada duruyordu zaten.

## ABSOLUTE NANO

Geldik bence en eğlenceli soruya. Sistemde `ctf-player` olarak varız. Bulunduğumuz dizinde `flag.txt` var ama sahibi root olduğu için okuyamıyoruz. `sudo -l` ile yetkilerimize bakıyoruz:

```
(ALL) NOPASSWD: /bin/nano /etc/sudoers
```

![ABSOLUTE NANO — sudoers](/images/absolute-nano.png)

Yani sistem diyor ki: sen nano editörünü kullanarak `/etc/sudoers` dosyasını parola girmeden root olarak düzenleyebilirsin. *(Bu arada küçük bir itiraf: Dosyayı ilk açtığımda yanlışlıkla içini bozup sistemi kilitledim ve sunucuyu sıfırlamak zorunda kaldım :D)*

`sudo nano /etc/sudoers` yazarak sudoers'ı root olarak açtım. Nano içindeyken `Ctrl + R` (Read File) ve `Ctrl + X` (Execute Command) yapıyoruz. Nano bize komut satırı veriyor mis gibi. Sonrasında `cat flag.txt` — bitti.

Evet bu yazımız da bu kadar. PicoCTF 2026 için bir yazı daha yazmayı düşünüyorum. Bu yazıda "General Skills" bölümünden birkaç soru çözdük. Web Exploitation için de bir yazı paylaşıyor olacağım. Okuduğunuz için teşekkürler. Görüşmek üzere.

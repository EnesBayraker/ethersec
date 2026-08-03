---
title: 'Kendi Laboratuvarımda Zafiyet Analizi: Nessus ve Metasploitable'
description: 'İzole bir laboratuvar ağında Nessus ile Metasploitable taraması yaptım; çıkan bulguları bir analist gözüyle değerlendirdim.'
pubDate: 2026-02-28
tags: ['nessus', 'vulnerability-management', 'metasploitable', 'lab']
cover: '/covers/nessus.png'
---

Siber güvenlik alanında kariyer hedeflerken, çoğu kez teorik bilginin değil hands-on experience'in ne kadar önemli olduğunun farkındayım. Bu yüzden bugün yine sanal makinelerimin başına geçtim.

![Nessus Giriş Ekranı](/images/nessus-giris.png)

Bu projedeki temel amacım; sektör standartlarında bir Vulnerability Management sürecinin nasıl kurgulandığını kavramak, güvenli bir ağ mimarisi oluşturmak ve endüstride en çok tercih edilen tarama araçlarından biri olan Tenable Nessus'u uygulamalı olarak deneyimlemekti. Bu test için hedef sistem olarak, kasıtlı olarak birçok güvenlik zafiyeti barındıran *Metasploitable* sanal makinesini seçtim.

![Metasploitable ifconfig](/images/metasploitable-ip.png)

Kali sanal makinemi ve Metasploitable'ımın ağ konfigürasyonlarını tabi ki host only'ye çektim. Metasploitable kasten fazlaca zafiyete sahip bir sistem ve kendi ev ağımla aynı ağa soksaydım NAT veya Bridged moduyla kendi ağımı sıkıntıya sokmuş olacaktım. VMware'in host only modu sayesinde aynı sanal switch içinde bulundular bir nevi ve birbirlerini gördüler sadece.

![Konfigürasyon Ekranı](/images/konfigurasyon.png)

Laboratuvar ağını güvenli bir şekilde kurduktan sonra hedef sistem için bir **Basic Network Scan** yapılandırdım ve süreci başlattım. Yaklaşık yarım saat süren bu işlem boyunca Nessus, izole ağımız üzerinden Metasploitable makinesine binlerce paket göndererek açık portları, çalışan servisleri ve bilinen zafiyet signature'lerini detaylıca analiz etti.

Tarama tamamlandığında ortaya çıkan sonuç ekranı, sistemin güvenlik duruşunu gösteriyordu. Nessus **64 farklı bulgu** tespit etmişti. Sağ alt köşedeki pasta grafiğine baktığımızda, sonuçların büyük bir çoğunluğunu Info, Low ve Medium seviyeli bulguların oluşturduğunu görüyoruz.

![Sonuç Ekranı](/covers/nessus.png)

Ancak siber güvenlikte risk değerlendirmesi yaparken sayıdan ziyade **etkinin önemli olduğunu** unutmamak gerekir. Grafik üzerinde sayıca küçük bir dilim kaplasalar da, araya gizlenmiş Critical ve High seviyeli zafiyetler, sistemi tamamen ele geçirmeye olanak tanıyan ölümcül açıklardı.

Bunların bir laboratuvar ortamı değil de gerçek bir şirket sorunu olduğunu düşünürsem çözüm önerileri olarak şu adımları izlerdim:

**1. İşletim Sistemi Yaşam Döngüsü:** Listede 10.0 CVSS skoruyla en üstte yer alan "Canonical Ubuntu Linux SEoL (8.04.x)" zafiyeti, sistemin ömrünü tamamladığını ve artık güvenlik güncellemesi almadığını gösteriyor. Böyle bir sisteme yama yapmak mümkün değildir. En kesin çözüm; sunucu üzerindeki servisleri güncel ve desteklenen modern bir Linux dağıtımına taşımak ve bu eski makineyi ağdan tamamen kaldırmak olur.

**2. Kimlik Doğrulama ve Erişim Kontrolleri (Hardening):** Nessus'un yakaladığı "VNC Server 'password' Password" zafiyeti saldırganlara doğrudan uzak masaüstü yetkisi verir. Varsayılan ve zayıf parolaları derhal karmaşık parolalarla değiştirirdim. Ayrıca "NFS Shares World Readable" bulgusu için, dışarıdan herkesin okuyabildiği açık dosya paylaşımlarının permission'larını sadece ilgili kullanıcıların erişebileceği şekilde sınırlandırırdım.

**3. Güvenli İletişim ve Web Servisleri:** "SSL Version 2 and 3 Protocol Detection" zafiyeti, veri iletişiminin kolayca kırılabilir eski protokollerle yapıldığını gösteriyor. Eski SSL versiyonlarını sunucu üzerinden devre dışı bırakır, yerine güncel TLS versiyonlarını zorunlu kılardım. "Apache Tomcat AJP Connector Request Injection" açığı için ise ilgili Tomcat servisine acilen en son güvenlik patch'ini geçerdim.

**4. Backdoors ve Acil İzolasyon:** Listede parlayan "Bind Shell Backdoor" ve "Samba Badlock" gibi doğrudan sistemi ele geçirmeye yönelik açıklar için ilk aksiyonum izolasyon olurdu. İlgili açık portları Firewall üzerinden derhal kapatır ve zararlı process'leri sonlandırarak Incident Response sürecini başlatırdım.

![Nessus detay](/images/nessus-sonuc.jpeg)

Sonuç olarak bu laboratuvar çalışması sayesinde, teorik olarak bildiğim Zafiyet Yönetimi kavramını tamamen pratik bir düzleme taşıma fırsatı buldum. İzole bir ağ kurmanın mantığını, Nessus gibi endüstri standardı bir aracın konfigürasyonunu ve en önemlisi kritik zafiyetleri tespit edip, sisteme bir analist gözüyle nasıl bakacağımı tecrübe ettim.

Okuduğunuz için teşekkür ederim. Siber güvenlik alanındaki yolculuğumda kurduğum diğer laboratuvar ortamlarını ve analizlerimi paylaşmaya devam edeceğim. Geri bildirimleriniz benim için çok değerli!

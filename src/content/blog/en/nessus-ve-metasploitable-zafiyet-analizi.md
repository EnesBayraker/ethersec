---
title: 'Vulnerability Analysis in My Own Lab: Nessus and Metasploitable'
description: 'Scanning Metasploitable with Nessus on an isolated lab network and reviewing the findings like an analyst.'
pubDate: 2026-02-28
tags: ['nessus', 'vulnerability-management', 'metasploitable', 'lab']
cover: '/covers/nessus.png'
---

While aiming for a career in cybersecurity, I'm aware that more often than not it's hands-on experience — not theoretical knowledge — that really counts. So today I sat back down in front of my virtual machines.

![Nessus login screen](/images/nessus-giris.png)

My main goal in this project was to understand how an industry-standard Vulnerability Management process is set up, build a secure network architecture, and get hands-on with Tenable Nessus, one of the most widely used scanning tools in the industry. As the target system for this test I picked the *Metasploitable* virtual machine, which deliberately contains a ton of security vulnerabilities.

![Metasploitable ifconfig](/images/metasploitable-ip.png)

I of course set both my Kali VM and Metasploitable to host-only networking. Metasploitable is a system intentionally full of vulnerabilities, and if I'd put it on the same network as my home setup via NAT or bridged mode, I'd have been putting my own network at risk. Thanks to VMware's host-only mode, they ended up on the same virtual switch, in a way — they could only see each other.

![Configuration screen](/images/konfigurasyon.png)

After setting up the lab network safely, I configured a **Basic Network Scan** for the target system and kicked off the process. Over roughly half an hour, Nessus sent thousands of packets across my isolated network to the Metasploitable machine, thoroughly analyzing open ports, running services, and known vulnerability signatures.

When the scan finished, the results screen laid out the system's security posture. Nessus had detected **64 different findings**. Looking at the pie chart in the bottom-right corner, we can see that the vast majority of the results were Info, Low, and Medium severity findings.

![Results screen](/covers/nessus.png)

But when doing risk assessment in cybersecurity, you have to remember that what matters is **impact**, not the count. Even though they occupy a small slice of the chart by number, the Critical and High severity vulnerabilities hidden in there were fatal holes that could allow a full takeover of the system.

If these were problems for a real company instead of a lab environment, here's the remediation roadmap I would follow:

**1. Operating System Lifecycle:** Sitting at the top with a 10.0 CVSS score, the "Canonical Ubuntu Linux SEoL (8.04.x)" finding means the system has reached end-of-life and no longer receives security updates. Patching such a system isn't possible. The most definitive fix would be to migrate the services on the server to a modern, supported Linux distribution and remove this old machine from the network entirely.

**2. Authentication and Access Controls (Hardening):** The "VNC Server 'password' Password" finding Nessus caught would give attackers direct remote-desktop access. I'd immediately replace the default and weak passwords with strong ones. And for the "NFS Shares World Readable" finding, I'd restrict the permissions on the openly-readable file shares so only the relevant users can access them.

**3. Secure Communications and Web Services:** The "SSL Version 2 and 3 Protocol Detection" finding shows that data is being exchanged over old protocols that are easy to break. I'd disable the legacy SSL versions on the server and enforce current TLS versions instead. For the "Apache Tomcat AJP Connector Request Injection" flaw, I'd urgently apply the latest security patch to the affected Tomcat service.

**4. Backdoors and Immediate Isolation:** For the glaring issues like "Bind Shell Backdoor" and "Samba Badlock" that target direct system compromise, my first action would be isolation. I'd immediately close the relevant open ports at the firewall and kill the malicious processes, kicking off an Incident Response process.

![Nessus detail](/images/nessus-sonuc.jpeg)

All in all, this lab work gave me the chance to take the Vulnerability Management concept I knew in theory and move it fully into a practical setting. I experienced the reasoning behind building an isolated network, configuring an industry-standard tool like Nessus, and most importantly detecting critical vulnerabilities and looking at a system through an analyst's eyes.

Thanks for reading. I'll keep sharing the lab environments and analyses I build along my journey in cybersecurity. Your feedback means a lot to me!

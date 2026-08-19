Nabta on your phone
===================

Double click START-PHONE.bat, then open the address it prints on your phone.

The phone and this PC must be on the same Wi-Fi.


Why there is a certificate warning
----------------------------------
The address is https, not http, and the certificate is self signed rather than
issued by a public authority. Your phone has no reason to trust it, so it warns
you. Tap through it:

  iPhone   Show Details, then Visit This Website
  Android  Advanced, then Proceed

The warning is expected and it is safe here: the traffic never leaves your
local network.


Why it has to be https at all
-----------------------------
Browsers only allow camera access on a secure origin. Over plain http the phone
can display the site, but getUserMedia is blocked, so the camera will not open
and the verification loop will not run. Since that loop is the product, plain
http is not worth serving.


What the pieces are
-------------------
  START-PHONE.bat   what you double click
  phone.ps1         finds your network address, mints the certificate,
                    starts the dev server if it is not already running
  proxy.js          terminates https on port 3443 and forwards to the dev
                    server on 127.0.0.1:3000
  certs/            generated per machine, not committed

The bridge sits in front of the dev server rather than replacing it. Two
"next dev" processes share the .next directory and corrupt each other, so the
desktop keeps using http://localhost:3000 while the phone uses https on 3443.
Hot reload works on the phone: edit a file and the phone updates.


If the phone cannot reach it
----------------------------
1. Confirm both devices are on the same network.

2. Some networks, particularly guest and public Wi-Fi, isolate clients from
   each other so devices cannot see one another at all. Nothing on this PC can
   work around that. Test it by turning on your phone's hotspot, connecting
   this PC to the hotspot, and running START-PHONE.bat again. It picks up the
   new address automatically.

3. If Windows shows a firewall prompt for Node.js, allow it.

4. The address changes when the network hands out a new DHCP lease. Just run
   START-PHONE.bat again, it mints a fresh certificate for the new address.


Stopping it
-----------
Close the window. If the script started the dev server for you, that runs in
its own minimised window and needs closing separately.

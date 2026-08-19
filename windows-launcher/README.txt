===============================================================
  NABTA - نبتة
  Plant. Verify. Earn.

  Community planting, AI-verified, for the UAE National
  Food Security Strategy 2051.
===============================================================


HOW TO RUN
-----------------------------------------------------------
  Double-click  START.bat

  That is the whole procedure. A black window opens and your
  browser goes to the app automatically.

  KEEP THE BLACK WINDOW OPEN while you use the app.
  Closing it stops the server.


WHAT IT NEEDS
-----------------------------------------------------------
  Nothing to install.

  If Python is on the machine, START.bat serves the app with
  Python. If it is not, it falls back to a server built into
  Windows itself. Either way it runs, offline, with no admin
  rights and no internet connection.


USING IT
-----------------------------------------------------------
  Home         Points, streak, national rank, live challenges
  Verify       Photograph your work - the core loop
  Leaderboard  Growers, schools, and emirate standings
  Market       Buy, sell, swap or give away between growers
  Rewards      Spend points on seeds, tools and vouchers
  Learn        Guided paths and the UAE sowing calendar
  Government   Permits, subsidies, and 2051 alignment

  On the Verify screen you can use the camera, upload a photo,
  or press "Use a sample photo" if there is no plant to hand.
  The sample works on any laptop and is the easiest way to demo.

  "Reset demo data" in the sidebar clears everything and starts
  the demo over.


ON A PHONE
-----------------------------------------------------------
  The camera needs a secure connection, so opening these files
  directly from a USB stick will not work. Either:

    - Run START.bat on a laptop and open the address it shows
      from a phone on the same Wi-Fi, or
    - Host the "app" folder on any web host with HTTPS

  Once open on a phone, use "Add to Home Screen" and it runs
  full-screen like an installed app.


WHAT IS REAL AND WHAT IS PLACEHOLDER
-----------------------------------------------------------
  Real         The interaction design, the points maths, the
               verification flow and its integrity checks, the
               crop calendar and sowing windows.

  Placeholder  Every other grower and team on the leaderboard,
               all partner brands, the national impact figures,
               and the government programmes.

  The AI verification is simulated locally and is deterministic
  per image - submit the same photo twice and the duplicate
  check catches it. A real vision model drops in behind a single
  interface without changing any screen.

  This is a prototype. Nothing in it has been reviewed or
  endorsed by any authority, and the ministries shown illustrate
  where the platform would connect, not that it does.


WHAT IS IN THIS FOLDER
-----------------------------------------------------------
  START.bat               Double-click this
  app\                    The application
  launcher\server.py      Python server
  launcher\serve.ps1      Windows fallback server
  Nabta-Cost-Model.docx   Cost analysis at scale


TROUBLESHOOTING
-----------------------------------------------------------
  Nothing happens
     Extract the ZIP first. Running START.bat from inside the
     compressed file will not work.

  Browser does not open
     Copy the http://localhost address from the black window
     into your browser manually.

  "Windows protected your PC"
     Click "More info", then "Run anyway". This appears for any
     downloaded .bat file that is not code-signed.

  Camera does not work
     Allow camera access when the browser asks. If you declined,
     click the padlock in the address bar and re-enable it. Or
     just use "Use a sample photo" instead.

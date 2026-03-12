# 3D Sales Funnel Demo

Files included:
- `index.html` - main entry point
- `styles.css` - layout and styling
- `app.js` - 3D animation, physics-style bubble flow, adjustable funnel logic
- `server.py` - optional local server

## Run options

### Fastest
Open `index.html` in a browser.

### Recommended
Run a local server so browser security policies never get in the way:

```bash
python3 server.py
```

Then open:

```text
http://localhost:8000
```

## Notes
- Uses Three.js from a CDN for the 3D scene.
- Controls on the left let you adjust inflow, conversion rates, and value split.
- The right-hand tally updates as completed-client bubbles exit the value chamber.

<script>
  export let logo = '/satyrn_logo_with_wordmark_75.png';
  export let title = 'Satyrn';
</script>

<header class="satyrn-nav">
  <div class="nav-inner">
    <img src={logo} alt="Satyrn" class="logo" />
    <div class="brand">{title}</div>
    <slot name="right" />
  </div>
</header>

<style>
.satyrn-nav { position: sticky; top:0; backdrop-filter: blur(4px); z-index:50;
  background: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(0,0,0,0.06);
}
.nav-inner { display:flex; align-items:center; gap:12px; padding:8px 12px; }
.logo { width: 36px; height:36px; object-fit:contain; }
.brand { font-family: 'Orbitron', system-ui, sans-serif; font-weight:500; letter-spacing:0.08em; }
</style>

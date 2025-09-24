<script>
	import favicon from '$lib/assets/favicon.svg';
    import '../app.css'; 
	let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- Google Fonts: Inter (or switch to Roboto if you prefer) -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<!-- Theme wrapper -->
<div class="satyrn-theme">

{@render children?.()}

</div>	
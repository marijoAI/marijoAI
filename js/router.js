/* Simple hash-based SPA router */

(function() {
	const mainContent = document.getElementById('main-content');
	const initialHomeHTML = mainContent ? mainContent.innerHTML : '';

	const routes = {
		'/': { templateId: null, init: null },
		'/clean-data': { templateId: 'tmpl-clean-data', init: 'initCleanDataPage' },
		'/train': { templateId: 'tmpl-train', init: 'initTrainPage' },
		'/predict': { templateId: 'tmpl-predict', init: 'initPredictPage' },
		'/tutorial': { templateId: 'tmpl-tutorial', init: null },
		'/legal': { templateId: 'tmpl-legal', init: null },
		'/privacy': { templateId: 'tmpl-privacy', init: null },
		'/cookies': { templateId: 'tmpl-cookies', init: null }
	};

	function getPathFromHash() {
		const hash = window.location.hash || '#/';
		if (!hash.startsWith('#')) return '/';
		const path = hash.slice(1);
		return path || '/';
	}

	function setActiveNav(path) {
		const links = document.querySelectorAll('.nav-links a.nav-link');
		links.forEach(a => {
			const href = a.getAttribute('href') || '';
			const isActive = href.replace('#', '') === path;
			if (isActive) a.classList.add('active'); else a.classList.remove('active');
		});
	}

	function loadRoute(path) {
		const route = routes[path] || routes['/'];
		setActiveNav(path);

		if (!mainContent) return;

		if (!route.templateId) {
			mainContent.innerHTML = initialHomeHTML;
			window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
			return;
		}

		const tpl = document.getElementById(route.templateId);
		mainContent.innerHTML = '';
		if (tpl && tpl.content) {
			mainContent.appendChild(tpl.content.cloneNode(true));
		} else {
			mainContent.innerHTML = '<div class="container"><p style="padding:1rem;color:#c00;">Page not found.</p></div>';
		}

		if (route.init && typeof window[route.init] === 'function') {
			try { window[route.init](); } catch (e) { console.error('Init error for route', path, e); }
		}

		window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
	}

	function onHashChange() {
		const path = getPathFromHash();
		loadRoute(path);
	}

	// Intercept clicks on internal links that point to our routes when possible
	document.addEventListener('click', (e) => {
		const a = e.target && (e.target.closest ? e.target.closest('a') : null);
		if (!a) return;
		const href = a.getAttribute('href');
		if (!href) return;
		if (href.startsWith('#/')) {
			e.preventDefault();
			const target = href;
			if (window.location.hash !== target) {
				window.location.hash = target;
			} else {
				onHashChange();
			}
		}
	});

	window.addEventListener('hashchange', onHashChange);
	// Initial navigation
	onHashChange();
})();



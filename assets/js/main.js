(function () {
  function setReplyText(text) {
    var $ta = $('#response');
    if (!$ta.length) return false;

    // Ensure the Post Reply tab is active so editor is initialized
    var $postBtn = $('a.post-response.action-button').first();
    if ($postBtn.length && !$postBtn.hasClass('active')) {
      try { $postBtn.trigger('click'); } catch (e) { }
    }

    // Prefer Redactor source.setCode when richtext is enabled
    try {
      if (typeof $ta.redactor === 'function' && $ta.hasClass('richtext')) {
        var current = $ta.redactor('source.getCode') || '';
        var newText = current ? (current + "\n\n" + text) : text;
        $ta.redactor('source.setCode', newText);
        return true;
      }
    } catch (e) { }

    // Fallback to plain textarea append
    var current = $ta.val() || '';
    $ta.val(current ? (current + "\n\n" + text) : text).trigger('change');
    return true;
  }

  function setLoading($a, loading) {
    try {
      if (loading) {
        $a.addClass('ai-loading');
        // Ensure a global, always-visible spinner is shown
        if (!document.getElementById('ai-global-spinner')) {
          var spinner = document.createElement('div');
          spinner.id = 'ai-global-spinner';
          document.body.appendChild(spinner);
        }
        document.body.classList.add('ai-loading-global');
      } else {
        $a.removeClass('ai-loading');
        // If no other AI actions are loading, hide the global spinner
        setTimeout(function(){
          if ($('.ai-loading').length === 0) {
            document.body.classList.remove('ai-loading-global');
            var s = document.getElementById('ai-global-spinner');
            if (s) s.parentNode.removeChild(s);
          }
        }, 0);
      }
    } catch (e) { /* ignore */ }
  }

  $(document).on('click', 'a.ai-generate-reply', function (e) {
    e.preventDefault();
    var $a = $(this);
    var tid = $a.data('ticket-id');
    if (!tid) return false;

    setLoading($a, true);
    var url = (window.AIResponseGen && window.AIResponseGen.ajaxEndpoint) || 'ajax.php/ai/response';

    $.ajax({
      url: url,
      method: 'POST',
      data: { ticket_id: tid, instance_id: $a.data('instance-id') || '' },
      dataType: 'json'
    }).done(function (resp) {
      if (resp && resp.ok) {
        if (!setReplyText(resp.text || '')) {
          alert('AI response generated, but reply box not found.');
        }
      } else {
        alert((resp && resp.error) ? resp.error : 'Failed to generate response');
      }
    }).fail(function (xhr) {
      var msg = 'Request failed';
      try {
        var r = JSON.parse(xhr.responseText);
        if (r && r.error) msg = r.error;
      } catch (e) { }
      alert(msg);
    }).always(function () {
      setLoading($a, false);
    });

    return false;
  });

  // Auto-generate a draft on first agent visit per ticket (configurable)
  $(function(){
    try {
      // Respect configuration flag; default to enabled when flag is missing for backward compatibility
      if (window.AIResponseGen && window.AIResponseGen.autoDraftEnabled === false) return;

      var $btn = $('a.ai-generate-reply').first();
      if (!$btn.length) return;
      var tid = $btn.data('ticket-id');
      if (!tid) return;
      var key = 'ai-autodraft:' + tid;
      if (window.localStorage && localStorage.getItem(key)) return;
      var $ta = $('#response');
      if (!$ta.length) return;
      var current = '';
      if (typeof $ta.redactor === 'function' && $ta.hasClass('richtext')) {
        current = $ta.redactor('source.getCode') || '';
      } else {
        current = $ta.val() || '';
      }
      if ((current || '').trim().length) return; // do not override existing content
      if (window.localStorage) localStorage.setItem(key, String(Date.now()));
      $btn.trigger('click');
    } catch (e) { try { alert('Auto-draft failed: ' + (e && (e.message || e))); } catch(_) {} }
  });
})();

import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const targetUrl = 'https://api.apistry.net';

/**
 * TryIt component: interactive API caller for Docusaurus MDX docs.
 * Usage: <TryIt basePath="/v1/books/" defaultParams="?bookTitle=*Hail*" resources={[...]} />
 * - basePath: API base path (e.g. /v1/books/)
 * - defaultParams: initial query string or path
 * - resources: optional array OR comma-separated string of resource names
 *              If resources are provided, the fixed "base" portion becomes a dropdown.
 */
export default function TryIt({ basePath = '/v1/books/', defaultParams = '?bookTitle=*Hail*', resources = null, autoLoad = true }) {
  const [input, setInput] = React.useState(defaultParams);
  const [status, setStatus] = React.useState('—');
  const [output, setOutput] = React.useState('Response will appear here.');
  const [loading, setLoading] = React.useState(false);
  const hasAutoLoadedRef = React.useRef(false);

  const normalizedResources = React.useMemo(() => {
    if (!resources) return null;
    if (Array.isArray(resources)) {
      return resources.map(r => (typeof r === 'string' ? r.trim() : r)).filter(Boolean);
    }
    if (typeof resources === 'string') {
      return resources.split(',').map(r => r.trim()).filter(Boolean);
    }
    return null;
  }, [resources]);

  const baseUrlCandidates = React.useMemo(() => {
    const base = targetUrl + basePath;
    if (!normalizedResources || normalizedResources.length === 0) {
      return [base];
    }
    // Offer a base url per resource (makes the fixed portion selectable)
    return normalizedResources.map(r => base + r.replace(/^\//, '') + '/');
  }, [basePath, normalizedResources]);

  const [selectedBaseUrl, setSelectedBaseUrl] = React.useState(baseUrlCandidates[0]);

  // Keep selectedBaseUrl stable if baseUrlCandidates changes (e.g. client hydration)
  React.useEffect(() => {
    if (!baseUrlCandidates || baseUrlCandidates.length === 0) return;
    if (!baseUrlCandidates.includes(selectedBaseUrl)) {
      setSelectedBaseUrl(baseUrlCandidates[0]);
    }
  }, [baseUrlCandidates, selectedBaseUrl]);

  function normalizePath(value) {
    if (!value) return '';
    return value.replace(/^\//, '');
  }

  const sendRequest = React.useCallback(async () => {
    setLoading(true);
    setStatus('Loading...');
    setOutput('');

    const relativePath = normalizePath(input.trim());

    const url = selectedBaseUrl + relativePath;
    try {
      const response = await fetch(url);
      setStatus(response.status + ' ' + response.statusText);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setOutput(JSON.stringify(data, null, 2));
      } else {
        const data = await response.text();
        setOutput(data);
      }
    } catch (err) {
      setStatus('Error');
      setOutput(err.toString());
    } finally {
      setLoading(false);
    }
  }, [input, selectedBaseUrl]);

  React.useEffect(() => {
    if (!autoLoad || hasAutoLoadedRef.current) return;
    hasAutoLoadedRef.current = true;
    sendRequest();
  }, [autoLoad, sendRequest]);

  const showBaseUrlDropdown = !!(normalizedResources && normalizedResources.length >= 1);

  return (
    <Box sx={{ my: 4, fontFamily: 'system-ui,sans-serif' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2,
          gap: 0,
          background: '#f1f5f9',
          borderRadius: 2,
          boxShadow: 1,
          p: 0.5,
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendRequest(); } }}
          aria-label="API path and query params"
          // placeholder="?bookTitle=*Hail*"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{
                background: '#f1f5f9',
                color: '#2563eb',
                fontWeight: 600,
                borderRadius: '8px 0 0 8px',
                px: 1.5,
                fontSize: '0.85rem',
                display: 'inline-flex',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                flex: '0 0 auto',
                maxWidth: 'none',
              }}>
                {showBaseUrlDropdown ? (
                  <Select
                    variant="standard"
                    value={selectedBaseUrl}
                    onChange={e => {
                      setSelectedBaseUrl(e.target.value);
                      setInput("?limit=10"); // Set query string to '?limit=10' on dropdown change
                    }}
                    disableUnderline
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      '& .MuiSelect-select': { py: 0.25 },
                    }}
                  >
                    {baseUrlCandidates.map((u) => (
                      <MenuItem key={u} value={u} sx={{ fontSize: '0.85rem' }}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  baseUrlCandidates[0]
                )}
              </InputAdornment>
            ),
            sx: {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: 2,
              borderBottomLeftRadius: 2,
              background: '#f8fafc',
              flex: 1,
              minWidth: 80,
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              '& .MuiInputBase-input': {
                flex: '1 1 auto',
                minWidth: 80,
              },
            },
          }}
          sx={{ flex: 1, minWidth: 80, maxWidth: '100%' }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={sendRequest}
          disabled={loading}
          sx={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            minWidth: 70,
            height: '40px',
            ml: 0,
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </Box>
      <Box sx={{ mt: 2, fontSize: '0.95rem' }}><strong>Status:</strong> {status}</Box>
      <Box component="pre" aria-live="polite" sx={{ background: '#f8fafc', color: '#334155', p: 2, borderRadius: 2, minHeight: 120, overflowX: 'auto', fontSize: '0.85rem', lineHeight: 1.4, mt: 1 }}>{output}</Box>
    </Box>
  );
}

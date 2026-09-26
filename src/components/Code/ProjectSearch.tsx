import { useDeferredValue, useMemo, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, TextField, Stack, FormControlLabel, Checkbox, Typography, ButtonBase, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { searchProject } from '../../utils/projectSearch';
export default function ProjectSearch({ open, onClose, files, onSelect }) {
  const [query, setQuery] = useState(''), [pathFilter, setPathFilter] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false), [wholeWord, setWholeWord] = useState(false);
  const deferred = useDeferredValue(query);
  const result = useMemo(() => searchProject(files, deferred, { pathFilter, caseSensitive, wholeWord }), [files, deferred, pathFilter, caseSensitive, wholeWord]);
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Search project <IconButton aria-label="Close project search" onClick={onClose} sx={{ float: 'right' }}><X size={18} /></IconButton></DialogTitle>
    <DialogContent>
      <Stack spacing={1} sx={{ pt: 1 }}>
        <TextField autoFocus label="Search source text" value={query} onChange={(e) => setQuery(e.target.value)} size="small" />
        <TextField label="Filter file paths (optional)" placeholder="e.g. src/ or .py" value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} size="small" />
        <Stack direction="row"><FormControlLabel label="Match case" control={<Checkbox checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />} /><FormControlLabel label="Whole word" control={<Checkbox checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />} /></Stack>
        <Typography variant="caption" color="text.secondary">{query ? `${result.matches.length}${result.truncated ? '+' : ''} matches${result.truncated ? ' — narrow your search to see more' : ''}` : 'Searches all loaded source files, including unsaved edits.'}</Typography>
        <Box sx={{ height: 360, overflow: 'auto' }}>
          {result.matches.map((match) => <ButtonBase key={`${match.path}:${match.line}:${match.column}`} onClick={() => { onSelect(match); onClose(); }} sx={{ width: '100%', display: 'block', textAlign: 'left', p: 1, borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
            <Typography variant="caption" color="primary">{match.path}:{match.line}:{match.column}</Typography>
            <Typography noWrap sx={{ fontFamily: 'monospace', fontSize: 12 }}>{match.preview}</Typography>
          </ButtonBase>)}
          {!!query && result.matches.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No matches found.</Typography>}
        </Box>
      </Stack>
    </DialogContent>
  </Dialog>;
}

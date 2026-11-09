  if(__xmem02c?.active())await __xmem02c.commit({projects:next,expectedProjects:entries,description:'Discovery project Save'});
  else if(!G7(next))throw Error('Melodic project could not be saved.');
 return record;
}

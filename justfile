set shell := ["sh", "-uc"]

install agent:
    @node ./.install/install.mjs "{{agent}}"

update agent:
    @node ./.install/update.mjs "{{agent}}"

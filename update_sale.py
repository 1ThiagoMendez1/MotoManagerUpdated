import sys
import os

filepath = 'd:/PRYECTOS APROBADOS/MOTOMANAGER/MotoManagerUpdated/src/components/forms/AddSale.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Card import
if 'import { Card }' not in content:
    content = content.replace('import { Popover, PopoverContent, PopoverTrigger } from \'@/components/ui/popover\';', 
                              'import { Popover, PopoverContent, PopoverTrigger } from \'@/components/ui/popover\';\nimport { Card } from \'@/components/ui/card\';')

# Find the return block start
start_idx = content.find('<Dialog open={isOpen} onOpenChange={setIsOpen}>')
end_idx = content.find('</Dialog>', start_idx) + len('</Dialog>')

new_dialog = """<Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Wrench className="mr-2 h-4 w-4" />
            Venta por Servicio
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background">
          <div className="p-6 pb-2 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary" />
                Registrar Venta por Servicio
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Asocia una venta a una orden de trabajo, agrega repuestos y mano de obra.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                
                {/* Service Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="w-6 h-px bg-border"></span>
                    Información del Servicio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormItem>
                      <FormLabel>Buscar por Placa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Ingresa la placa para buscar..."
                            value={plateSearch}
                            onChange={(e) => handlePlateSearch(e.target.value)}
                            className="bg-background border-input pl-10 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="workOrderId"
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel>Orden de Trabajo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} name={field.name}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-input focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="Se autocompletará con la placa" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredWorkOrders.map(order => (
                                <SelectItem key={order.id} value={order.id}>
                                  {order.workOrderNumber} - {order.motorcycle.make} {order.motorcycle.model} ({order.motorcycle.plate})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="laborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Mano de Obra (COP)</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              placeholder="Ej: 120000"
                              value={field.value ?? ''}
                              onChange={(val) => field.onChange(val === '' ? undefined : val)}
                              className="bg-background border-input focus:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("pl-3 text-left font-normal bg-background border-input hover:bg-accent transition-all w-full", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-px bg-border"></span>
                      Repuestos y Productos
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => append({ inventoryItemId: '', sku: '', quantity: 1, price: 0 })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar Producto
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const currentItem = watchItems?.[index];
                      const selectedItem = inventory.find(item => item.id === currentItem?.inventoryItemId);
                      const isOutOfStock = selectedItem && selectedItem.quantity === 0;
                      const itemPrice = currentItem?.price || 0;
                      const itemQuantity = currentItem?.quantity || 0;
                      const itemSubtotal = itemPrice * itemQuantity;
                      const isFromWorkOrder = (currentItem as any)?.fromWorkOrder === true;

                      return (
                        <Card key={field.id} className="p-3 border-border/50 bg-background/50 hover:bg-muted/10 transition-colors">
                          <div className="grid grid-cols-[1fr,2fr,120px,auto] items-start gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.sku`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="SKU..." {...field}
                                      className="bg-background border-input focus:ring-primary/20"
                                      disabled={isFromWorkOrder}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        handleSkuChange(e.target.value, index);
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.inventoryItemId`}
                              render={({ field: selectField }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => handleProductChange(value, index)}
                                    value={selectField.value}
                                    disabled={isFromWorkOrder}
                                  >
                                    <FormControl>
                                      <SelectTrigger className={`bg-background border-input ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''} ${isFromWorkOrder ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        <SelectValue placeholder="Selecciona un producto" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {inventory.map(item => (
                                        <SelectItem
                                          key={item.id}
                                          value={item.id}
                                          disabled={item.quantity === 0}
                                          className={item.quantity === 0 ? 'text-red-500' : ''}
                                        >
                                          {item.name} - ${item.price.toLocaleString('es-CO')} (Disp: {item.quantity})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        {...field}
                                        min={1}
                                        max={selectedItem?.quantity || 9999}
                                        className={`bg-background border-input pr-8 ${isOutOfStock ? 'text-red-500 border-red-500/50' : ''}`}
                                        disabled={isOutOfStock || isFromWorkOrder}
                                        placeholder={isOutOfStock ? "0" : undefined}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (selectedItem && val > selectedItem.quantity && !isFromWorkOrder) {
                                            toast({
                                              title: "Stock insuficiente",
                                              description: `Solo hay ${selectedItem.quantity} unidades de ${selectedItem.name}.`,
                                              variant: "destructive"
                                            });
                                            field.onChange(selectedItem.quantity);
                                          } else {
                                            field.onChange(e);
                                          }
                                        }}
                                      />
                                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                                        und
                                      </span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {!isFromWorkOrder ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            ) : (
                              <div className="w-10"></div>
                            )}
                          </div>
                          
                          {/* Item Subtotal Line */}
                          {watchItems[index]?.inventoryItemId && (
                            <div className="mt-3 flex justify-between items-center text-sm">
                              <div className={isOutOfStock ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                {isOutOfStock ? "⚠️ Producto sin stock" : `Precio unitario: $${itemPrice.toLocaleString('es-CO')}`}
                              </div>
                              {!isOutOfStock && (
                                <div className="font-medium text-foreground">
                                  Subtotal: ${itemSubtotal.toLocaleString('es-CO')}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                    <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                  </div>
                </div>

                {/* Checkout Section (Payment & Totals) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                  <div className="space-y-4">
                     <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <span className="w-6 h-px bg-border"></span>
                      Pago
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medio de Pago</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background border-input h-12">
                                <SelectValue placeholder="Selecciona medio de pago" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                              <SelectItem value="DaviPlata">DaviPlata</SelectItem>
                              <SelectItem value="Nequi">Nequi</SelectItem>
                              <SelectItem value="Addi">Addi</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento Especial (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} className="bg-background border-input w-32" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Totals Summary */}
                  <Card className="bg-primary/5 border-primary/20 p-6 flex flex-col justify-center space-y-3 rounded-xl">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Subtotal bruto:</span>
                      <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal)}</span>
                    </div>
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-red-500 font-medium bg-red-500/10 p-2 rounded-md">
                        <span>Descuento aplicado ({watchDiscount}%):</span>
                        <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(discountAmount)}</span>
                      </div>
                    )}
                    
                    {depositAmountFromWorkOrder > 0 && (
                      <div className="flex justify-between items-center text-sm text-emerald-700 font-medium bg-emerald-500/10 p-2 rounded-md">
                        <span>Abono registrado en la orden:</span>
                        <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(depositAmountFromWorkOrder)}</span>
                      </div>
                    )}

                    {depositAmountFromWorkOrder > 0 && remainingBalanceTotal > 0 && (
                      <div className="flex justify-between items-center text-sm text-amber-700 font-medium bg-amber-500/10 p-2 rounded-md">
                        <span>Saldo pendiente (Total - Abono):</span>
                        <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(remainingBalanceTotal)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-primary/20 pt-3 flex justify-between items-end mt-2">
                      <span className="text-base font-semibold text-foreground">Total a Cobrar:</span>
                      <span className="text-3xl font-bold tracking-tight text-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
                      </span>
                    </div>
                  </Card>
                </div>
                
              </div>
              
              <div className="p-6 border-t border-border/40 bg-muted/10">
                <div className="flex justify-end gap-3">
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="px-6">Cancelar</Button>
                  </DialogTrigger>
                  <Button type="submit" disabled={isSubmitting} className="px-8 shadow-lg shadow-primary/20">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Venta
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>"""

content = content[:start_idx] + new_dialog + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

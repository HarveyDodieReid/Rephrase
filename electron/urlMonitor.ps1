Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$lastUrl = ""

while ($true) {
    try {
        # Get the currently focused element
        $focusedElement = [System.Windows.Automation.AutomationElement]::FocusedElement
        if ($null -ne $focusedElement) {
            $pid = $focusedElement.Current.ProcessId
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            
            # Check if it's a browser
            if ($proc -and ($proc.Name -eq "chrome" -or $proc.Name -eq "msedge")) {
                
                # Attempt to find the address bar (Name="Address and search bar", ControlType=Edit)
                # Note: This search can be slow if we search the whole tree. 
                # We try to search from the window element.
                
                $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
                $node = $focusedElement
                $window = $null

                # Walk up to find the window
                while ($null -ne $node) {
                    if ($node.Current.ControlType.ProgrammaticName -eq "ControlType.Window") {
                        $window = $node
                        break
                    }
                    try { $node = $walker.GetParent($node) } catch { break }
                }

                if ($null -ne $window) {
                    $condName = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Address and search bar")
                    $condType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
                    $andCond = New-Object System.Windows.Automation.AndCondition($condName, $condType)

                    # Finding the address bar might fail if it's not in the view or accessible
                    $addressBar = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $andCond)

                    if ($null -ne $addressBar) {
                        # Use ValuePattern to get the URL
                        $pattern = $addressBar.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
                        if ($null -ne $pattern) {
                            $url = $pattern.Current.Value
                            
                            if ($url -ne $lastUrl) {
                                $lastUrl = $url
                                $bounds = $window.Current.BoundingRectangle
                            $rect = "$($bounds.X),$($bounds.Y),$($bounds.Width),$($bounds.Height)"
                            Write-Output "URL|$url|$rect"
                            [Console]::Out.Flush()
                            }
                        }
                    }
                }
            }
        }
    } catch {
        # Write-Error $_
    }
    Start-Sleep -Seconds 2
}
